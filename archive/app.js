(function () {
  "use strict";

  const archive = window.CHUNKPLAYER_ARCHIVE;
  const movies = archive.movies.map(movie => ({ ...movie, kind: "movie" }));
  const movieById = new Map(movies.map(movie => [movie.id, movie]));
  const categoryColors = { normal: "#68e5ff", punishment: "#ff557a", reward: "#ffd166" };
  const relationColors = { person: "#68e5ff", source: "#b18cff", production: "#ffd166", theme: "#66f0b0" };
  const dateFormatter = new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", year: "numeric" });
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function normalizePersonName(value) {
    return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
  }

  function slugify(value) { return normalizePersonName(value).replace(/ /g, "-"); }

  const connectionImages = window.CHUNKPLAYER_CONNECTION_IMAGES || {};
  const verifiedConnections = window.CHUNKPLAYER_VERIFIED_CONNECTIONS || [];
  const verifiedNames = new Set(verifiedConnections.map(connection => normalizePersonName(connection.label)));
  const hubIndex = new Map(verifiedConnections.map(connection => [connection.id, { ...connection, kind: "hub" }]));

  /* Hand-curated hubs are now limited to concepts, never cast or crew. */
  movies.forEach(movie => (movie.connections || []).filter(connection => connection.type === "source").forEach(connection => {
    if (verifiedNames.has(normalizePersonName(connection.label))) return;
    if (!hubIndex.has(connection.id)) hubIndex.set(connection.id, { ...connection, kind: "hub", movies: [] });
    hubIndex.get(connection.id).movies.push(movie.id);
  }));
  (archive.themes || []).forEach(theme => hubIndex.set(theme.id, { ...theme, kind: "hub" }));
  const allHubs = Array.from(hubIndex.values()).filter(hubNode => hubNode.movies.length > 1);
  const allLinks = allHubs.flatMap(hubNode => hubNode.movies.map(movieId => ({
    id: `${movieId}-${hubNode.id}`,
    sourceId: movieId,
    targetId: hubNode.id,
    type: hubNode.type,
    label: hubNode.label
  })));

  const svg = d3.select("#graph");
  const viewport = d3.select("#viewport");
  const linkLayer = d3.select("#links");
  const nodeLayer = d3.select("#nodes");
  const axisLayer = d3.select("#timeline-axis");
  const mapElement = document.getElementById("map");
  const panel = document.getElementById("detail-panel");
  const backdrop = document.getElementById("detail-backdrop");
  const status = document.getElementById("live-status");
  let width = 1200;
  let height = 700;
  let layout = "web";
  let selectedId = null;
  let searchTerm = "";
  let currentNodes = [];
  let currentLinks = [];
  let simulation;
  let settleTimer;
  let detailReturnFocus = null;
  let currentDetail = null;
  let detailHistory = [];
  const savedPositions = new Map();

  const zoom = d3.zoom()
    .scaleExtent([0.18, 3.5])
    .filter(event => !event.target.closest || !event.target.closest(".movie-node, .hub-node"))
    .on("zoom", event => viewport.attr("transform", event.transform));
  svg.call(zoom).on("dblclick.zoom", null);

  document.getElementById("movie-count").textContent = movies.length;
  document.getElementById("connection-count").textContent = allLinks.length;
  const dated = movies.filter(movie => movie.watchedDate).map(movie => movie.watchedDate).sort();
  document.getElementById("year-span").textContent = dated.length ? `${dated[0].slice(0, 4)}–${dated.at(-1).slice(0, 4)}` : "—";

  function checkedValues(selector) {
    return new Set(Array.from(document.querySelectorAll(`${selector} input:checked`)).map(input => input.value));
  }

  function rebuild() {
    const categories = checkedValues("#category-filters");
    const relations = checkedValues("#relation-filters");
    const visibleMovies = movies.filter(movie => categories.has(movie.category));
    const visibleMovieIds = new Set(visibleMovies.map(movie => movie.id));
    const links = allLinks.filter(link => visibleMovieIds.has(link.sourceId) && relations.has(link.type));
    const activeHubIds = new Set(links.map(link => link.targetId));
    const hubs = allHubs.filter(hubNode => activeHubIds.has(hubNode.id));
    const nodes = [...visibleMovies, ...hubs].map(node => ({ ...node }));
    const nodeById = new Map(nodes.map(node => [node.id, node]));
    currentNodes = nodes;
    currentLinks = links.map(link => ({ ...link, source: nodeById.get(link.sourceId), target: nodeById.get(link.targetId) }));

    document.getElementById("empty-state").hidden = visibleMovies.length !== 0;
    draw();
    applySearchAndSelection();
    status.textContent = `${visibleMovies.length} titles and ${links.length} relationship lines shown.`;
  }

  function draw() {
    if (simulation) simulation.stop();
    clearTimeout(settleTimer);
    linkLayer.selectAll("line")
      .data(currentLinks, link => link.id)
      .join(
        enter => enter.append("line").attr("class", link => `link ${link.type}`).attr("stroke", link => relationColors[link.type]).attr("stroke-width", 1.5),
        update => update.attr("class", link => `link ${link.type}`),
        exit => exit.remove()
      );

    const nodeJoin = nodeLayer.selectAll("g.graph-node")
      .data(currentNodes, node => node.id)
      .join(
        enter => {
          const group = enter.append("g")
            .attr("class", node => `graph-node ${node.kind === "movie" ? `movie-node ${node.category}` : `hub-node ${node.type}`}`)
            .attr("role", "button")
            .attr("tabindex", 0)
            .attr("aria-label", node => node.kind === "movie" ? `${node.title}, ${node.releaseYear}` : `${node.label} connection`)
            .on("click", (event, node) => selectNode(node))
            .on("keydown", (event, node) => {
              if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectNode(node); }
            });
          group.filter(node => node.kind === "movie").each(function (node) { drawMovieNode(d3.select(this), node); });
          group.filter(node => node.kind === "hub").each(function (node) { drawHubNode(d3.select(this), node); });
          return group;
        },
        update => update,
        exit => exit.remove()
      );

    if (layout === "web") startWebSimulation(nodeJoin);
    else positionTimeline(nodeJoin);
  }

  function drawMovieNode(group, movie) {
    const clipId = `clip-${movie.id}`;
    group.append("clipPath").attr("id", clipId).append("rect").attr("x", -42).attr("y", -63).attr("width", 84).attr("height", 126).attr("rx", 7);
    group.append("rect").attr("class", "poster-frame").attr("x", -44).attr("y", -65).attr("width", 88).attr("height", 130).attr("rx", 9);
    group.append("image")
      .attr("href", movie.poster)
      .attr("x", -42).attr("y", -63).attr("width", 84).attr("height", 126)
      .attr("preserveAspectRatio", "xMidYMid slice")
      .attr("clip-path", `url(#${clipId})`)
      .on("error", function () { d3.select(this).attr("href", "assets/posters/placeholder.svg"); });
    group.append("rect").attr("class", "node-label-bg").attr("x", -52).attr("y", 68).attr("width", 104).attr("height", 33).attr("rx", 6);
    group.append("text").attr("class", "node-title").attr("y", 81).text(ellipsize(movie.title, 18));
    group.append("text").attr("class", "node-date").attr("y", 94).text(formatShortDate(movie));
    group.append("circle").attr("cx", 35).attr("cy", -55).attr("r", 5).attr("fill", categoryColors[movie.category]).attr("stroke", "#070816").attr("stroke-width", 1.5);
  }

  function drawHubNode(group, hubNode) {
    group.append("circle").attr("r", 27);
    const words = hubNode.label.split(" ");
    const lines = words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")] : [hubNode.label];
    group.selectAll("text").data(lines).join("text").attr("y", (_, index) => (index - (lines.length - 1) / 2) * 11 + 3).text(line => ellipsize(line, 16));
  }

  function startWebSimulation(nodeJoin) {
    axisLayer.selectAll("*").remove();
    assignWebTargets();
    currentNodes.forEach((node, index) => {
      const saved = savedPositions.get(node.id);
      node.x = saved?.x ?? node.webTargetX + Math.cos(index * 2.4) * 18;
      node.y = saved?.y ?? node.webTargetY + Math.sin(index * 2.4) * 18;
    });
    simulation = d3.forceSimulation(currentNodes)
      .force("link", d3.forceLink(currentLinks).id(node => node.id).distance(link => link.type === "person" ? 245 : 285).strength(.48))
      .force("charge", d3.forceManyBody().strength(node => node.kind === "movie" ? -1650 : -620))
      .force("x", d3.forceX(node => node.webTargetX).strength(node => node.kind === "movie" ? .2 : .12))
      .force("y", d3.forceY(node => node.webTargetY).strength(node => node.kind === "movie" ? .2 : .12))
      .force("collision", d3.forceCollide().radius(node => node.kind === "movie" ? 108 : 49).iterations(4))
      .alpha(1)
      .alphaDecay(.085)
      .velocityDecay(.68)
      .on("tick", ticked)
      .on("end", freezeWebPositions);
    nodeJoin.call(d3.drag()
      .on("start", () => { simulation.stop(); clearTimeout(settleTimer); })
      .on("drag", (event, node) => { node.x = event.x; node.y = event.y; ticked(); })
      .on("end", (_, node) => { savedPositions.set(node.id, { x: node.x, y: node.y }); }));
    settleTimer = setTimeout(() => {
      freezeWebPositions();
      focusWebCenter(false);
    }, reducedMotion ? 0 : 1250);
  }

  function assignWebTargets() {
    const centerX = width / 2;
    const centerY = height / 2;
    const movieNodes = currentNodes.filter(node => node.kind === "movie");
    const degree = new Map(movieNodes.map(node => [node.id, 0]));
    currentLinks.forEach(link => degree.set(link.sourceId, (degree.get(link.sourceId) || 0) + 1));
    const maxDegree = Math.max(1, ...degree.values());
    const groups = d3.groups(movieNodes, node => degree.get(node.id) || 0).sort((a, b) => b[0] - a[0]);

    groups.forEach(([nodeDegree, group], groupIndex) => {
      group.sort((a, b) => a.title.localeCompare(b.title));
      const centrality = nodeDegree / maxDegree;
      const radiusX = nodeDegree === 0 ? 1080 : 820 - centrality * 650;
      const radiusY = nodeDegree === 0 ? 670 : 520 - centrality * 390;
      group.forEach((node, index) => {
        const angle = (Math.PI * 2 * index / group.length) + groupIndex * .74;
        node.webTargetX = centerX + Math.cos(angle) * radiusX;
        node.webTargetY = centerY + Math.sin(angle) * radiusY;
        node.connectionDegree = nodeDegree;
      });
    });

    const movieTargets = new Map(movieNodes.map(node => [node.id, node]));
    currentNodes.filter(node => node.kind === "hub").forEach((node, index) => {
      const related = node.movies.map(id => movieTargets.get(id)).filter(Boolean);
      const averageX = d3.mean(related, movie => movie.webTargetX) ?? centerX;
      const averageY = d3.mean(related, movie => movie.webTargetY) ?? centerY;
      const angle = index * 2.399963;
      node.webTargetX = centerX + (averageX - centerX) * .72 + Math.cos(angle) * 70;
      node.webTargetY = centerY + (averageY - centerY) * .72 + Math.sin(angle) * 55;
    });
  }

  function freezeWebPositions() {
    if (simulation) simulation.stop();
    currentNodes.forEach(node => savedPositions.set(node.id, { x: node.x, y: node.y }));
    ticked();
  }

  function positionTimeline(nodeJoin) {
    if (simulation) simulation.stop();
    nodeJoin.on(".drag", null);
    const movieNodes = currentNodes.filter(node => node.kind === "movie").sort((a, b) => dateValue(a) - dateValue(b));
    const startX = 150;
    const spacing = 150;
    const trackY = Math.max(180, height * .48);
    movieNodes.forEach((node, index) => {
      node.x = startX + index * spacing;
      const categoryOffset = node.category === "punishment" ? 180 : node.category === "reward" ? -170 : (index % 2 ? 35 : -35);
      node.y = trackY + categoryOffset;
    });
    const moviePosition = new Map(movieNodes.map(node => [node.id, node]));
    currentNodes.filter(node => node.kind === "hub").forEach((node, index) => {
      const related = node.movies.map(id => moviePosition.get(id)).filter(Boolean);
      node.x = d3.mean(related, item => item.x) || startX;
      node.y = trackY + (index % 2 ? -105 : 105);
    });
    const duration = reducedMotion ? 0 : 700;
    nodeJoin.transition().duration(duration).attr("transform", node => `translate(${node.x},${node.y})`);
    linkLayer.selectAll("line").transition().duration(duration)
      .attr("x1", link => link.source.x).attr("y1", link => link.source.y)
      .attr("x2", link => link.target.x).attr("y2", link => link.target.y);
    drawTimelineAxis(movieNodes, trackY, startX, spacing);
    setTimeout(() => focusTimelineStart(trackY), duration + 30);
  }

  function drawTimelineAxis(movieNodes, trackY, startX, spacing) {
    axisLayer.selectAll("*").remove();
    if (!movieNodes.length) return;
    axisLayer.append("line").attr("class", "timeline-line").attr("x1", startX - 60).attr("x2", startX + (movieNodes.length - 1) * spacing + 60).attr("y1", trackY).attr("y2", trackY);
    const years = d3.groups(movieNodes.filter(movie => movie.watchedDate), movie => movie.watchedDate.slice(0, 4));
    years.forEach(([year, entries]) => {
      const x = d3.mean(entries, entry => entry.x);
      axisLayer.append("line").attr("class", "timeline-tick").attr("x1", x).attr("x2", x).attr("y1", trackY - 14).attr("y2", trackY + 14);
      axisLayer.append("text").attr("class", "timeline-label").attr("x", x).attr("y", trackY + 30).text(year);
    });
  }

  function ticked() {
    nodeLayer.selectAll("g.graph-node").attr("transform", node => `translate(${node.x},${node.y})`);
    linkLayer.selectAll("line")
      .attr("x1", link => link.source.x).attr("y1", link => link.source.y)
      .attr("x2", link => link.target.x).attr("y2", link => link.target.y);
  }

  function selectNode(node) {
    detailReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    detailHistory = [];
    navigateDetail(node.kind === "movie" ? "movie" : "hub", node.id, false);
  }

  function navigateDetail(kind, id, remember = true) {
    if (remember && currentDetail && (currentDetail.kind !== kind || currentDetail.id !== id)) detailHistory.push(currentDetail);
    currentDetail = { kind, id };
    selectedId = id;
    if (kind === "movie") showMovie(id);
    else showHub(id);
    updateBackControl();
    applySearchAndSelection();
  }

  function updateBackControl() {
    const back = document.getElementById("detail-back");
    back.hidden = detailHistory.length === 0;
    if (detailHistory.length) {
      const previous = detailHistory.at(-1);
      const label = previous.kind === "movie" ? movieById.get(previous.id)?.title : hubIndex.get(previous.id)?.label;
      back.setAttribute("aria-label", `Go back to ${label || "previous details"}`);
    }
  }

  function applySearchAndSelection() {
    const term = searchTerm.trim().toLowerCase();
    const matching = new Set();
    currentNodes.forEach(node => {
      const text = node.kind === "movie"
        ? [node.title, ...(node.alternateTitles || []), ...node.directors, ...node.producers, ...node.writers, ...node.cast].join(" ").toLowerCase()
        : node.label.toLowerCase();
      if (term && text.includes(term)) matching.add(node.id);
    });
    if (term) currentLinks.forEach(link => {
      if (matching.has(link.source.id) || matching.has(link.target.id) || link.label.toLowerCase().includes(term)) {
        matching.add(link.source.id); matching.add(link.target.id);
      }
    });

    const neighbors = new Set(selectedId ? [selectedId] : []);
    if (selectedId) currentLinks.forEach(link => {
      if (link.source.id === selectedId || link.target.id === selectedId) { neighbors.add(link.source.id); neighbors.add(link.target.id); }
    });
    const focusSet = term ? matching : neighbors;
    const hasFocus = focusSet.size > 0;
    nodeLayer.selectAll("g.graph-node")
      .classed("dim", node => hasFocus && !focusSet.has(node.id))
      .classed("focused", node => focusSet.has(node.id));
    linkLayer.selectAll("line")
      .classed("dim", link => hasFocus && !(focusSet.has(link.source.id) && focusSet.has(link.target.id)))
      .classed("focused", link => hasFocus && focusSet.has(link.source.id) && focusSet.has(link.target.id));
  }

  function showMovie(id) {
    const movie = movieById.get(id);
    if (!movie) return;
    openDetail();
    panel.dataset.kind = "movie";
    document.getElementById("detail-context").textContent = "Archive record";
    document.getElementById("detail-poster").src = movie.poster;
    document.getElementById("detail-poster").alt = `${movie.title} poster`;
    document.getElementById("detail-poster").onerror = event => { event.currentTarget.src = "assets/posters/placeholder.svg"; };
    document.getElementById("detail-kicker").textContent = `${movie.category} ${movie.type}`;
    document.getElementById("detail-title").textContent = movie.title;
    const alternate = movie.alternateTitles?.length ? `Also known as ${movie.alternateTitles.join(" · ")}` : "";
    document.getElementById("detail-alternate").textContent = alternate;
    document.getElementById("detail-alternate").hidden = !alternate;
    document.getElementById("detail-meta").textContent = `${movie.releaseYear} · ${movie.runtime ? `${movie.runtime} min · ` : ""}${movie.genres.join(" / ")}${movie.chunkCount ? ` · ${movie.chunkCount} chunks` : ""}`;
    document.getElementById("detail-watch").textContent = formatWatchDate(movie);
    document.getElementById("detail-watch").hidden = false;
    document.getElementById("detail-synopsis").textContent = movie.synopsis;
    document.getElementById("detail-credits").hidden = false;
    document.getElementById("detail-trivia-section").hidden = false;
    document.getElementById("detail-directors").textContent = movie.directors.join(", ");
    document.getElementById("detail-producers").textContent = movie.producers.join(", ");
    document.getElementById("detail-writers").textContent = movie.writers.join(", ");
    document.getElementById("detail-cast").textContent = movie.cast.join(", ");
    document.getElementById("detail-trivia").replaceChildren(...movie.trivia.map(item => element("li", item)));

    const links = allLinks.filter(link => link.sourceId === movie.id);
    const connectedHubs = links.map(link => hubIndex.get(link.targetId)).filter(Boolean);
    document.getElementById("detail-connections-section").hidden = !connectedHubs.length;
    document.getElementById("detail-connections-title").textContent = "In this constellation";
    document.getElementById("detail-connections").replaceChildren(...connectedHubs.map(hub => connectionSummary(hub, movie.id)));
    const sourceNav = document.getElementById("detail-sources");
    sourceNav.replaceChildren(...movie.sources.map(source => {
      const link = element("a", source.label); link.href = source.url; link.target = "_blank"; link.rel = "noreferrer"; return link;
    }));
    status.textContent = `${movie.title} details opened.`;
  }

  function openDetail() {
    backdrop.hidden = false;
    panel.hidden = false;
    document.getElementById("detail-scroll").scrollTop = 0;
  }

  function showHub(id) {
    const hub = hubIndex.get(id);
    if (!hub) return;
    openDetail();
    panel.dataset.kind = hub.type;
    const isCredit = hub.type === "person" || hub.type === "production";
    const firstMovie = movieById.get(hub.movies[0]);
    const firstImage = connectionImage(hub, hub.movies[0]);
    const heroImage = isCredit ? (hub.portrait || firstImage?.image || firstMovie?.poster) : firstMovie?.poster;
    document.getElementById("detail-context").textContent = hub.type === "theme" ? "Major shared theme" : hub.type === "source" ? "Shared story world" : "Verified credit connection";
    document.getElementById("detail-poster").src = heroImage || "assets/posters/placeholder.svg";
    document.getElementById("detail-poster").alt = isCredit ? `${hub.label} portrait` : `${hub.label} connection image`;
    document.getElementById("detail-poster").onerror = event => { event.currentTarget.src = "assets/posters/placeholder.svg"; };
    document.getElementById("detail-kicker").textContent = hub.type;
    document.getElementById("detail-title").textContent = hub.label;
    document.getElementById("detail-alternate").hidden = true;
    document.getElementById("detail-meta").textContent = `${hub.movies.length} connected titles`;
    document.getElementById("detail-watch").hidden = true;
    document.getElementById("detail-synopsis").textContent = hub.type === "theme"
      ? "A deliberately curated major theme, shown only where it materially shapes each film."
      : hub.type === "source"
        ? "A shared franchise, anthology, or story-world relationship."
        : `The same credited person appears in ${hub.movies.length} watched titles. Roles and jobs are listed exactly as verified.`;
    document.getElementById("detail-credits").hidden = true;
    document.getElementById("detail-trivia-section").hidden = true;
    document.getElementById("detail-connections-section").hidden = false;
    document.getElementById("detail-connections-title").textContent = isCredit ? "Roles and film images" : "Connected films";
    document.getElementById("detail-connections").replaceChildren(...hub.movies.map(movieId => movieRoleCard(hub, movieId)));
    const sourceNav = document.getElementById("detail-sources");
    sourceNav.replaceChildren();
    if (hub.source) {
      const link = element("a", "TMDB profile"); link.href = hub.source; link.target = "_blank"; link.rel = "noreferrer"; sourceNav.append(link);
    }
  }

  function connectionImage(hub, movieId) {
    return connectionImages[`${slugify(hub.label)}--${movieId}`] || null;
  }

  function movieRoleCard(hub, movieId) {
    const movie = movieById.get(movieId);
    const roles = hub.roleByMovie?.[movieId] || [hub.type === "theme" ? "Major theme" : "Connected title"];
    const record = connectionImage(hub, movieId);
    const item = document.createElement("li");
    item.className = "movie-role-card";
    const image = document.createElement("img");
    image.src = record?.image || hub.portrait || movie.poster;
    image.alt = record?.image ? `${hub.label} in or associated with ${movie.title}` : `${movie.title} image`;
    image.onerror = event => { event.currentTarget.src = movie.poster; };
    const copy = document.createElement("div");
    const title = movieNavigationLink(movie, "movie-record-link");
    const role = element("span", roles.join(" · "));
    copy.append(title, role);
    item.append(image, copy);
    if (record?.source) {
      const source = element("a", "Image source"); source.href = record.source; source.target = "_blank"; source.rel = "noreferrer"; copy.append(source);
    }
    return item;
  }

  function connectionSummary(hub, currentMovieId) {
    const item = document.createElement("li");
    item.className = "connection-summary";
    const button = element("button", hub.label);
    button.type = "button";
    button.addEventListener("click", event => { event.stopPropagation(); navigateDetail("hub", hub.id); });
    item.append(button);
    hub.movies.forEach(movieId => {
      const movie = movieById.get(movieId);
      const roles = hub.roleByMovie?.[movieId] || ["Connected title"];
      const line = document.createElement("div");
      line.className = "connection-movie-line";
      if (movieId === currentMovieId) line.append(element("span", `${movie.title}:`));
      else {
        line.append(movieNavigationLink(movie, "inline-movie-link"));
        line.append(element("span", ":"));
      }
      line.append(element("span", roles.join(" · ")));
      item.append(line);
    });
    return item;
  }

  function movieNavigationLink(movie, className) {
    const link = element("a", movie.title);
    link.className = className;
    link.href = `#movie/${movie.id}`;
    link.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      navigateDetail("movie", movie.id);
    });
    return link;
  }

  function closeDetail() {
    if (panel.hidden) return;
    panel.hidden = true;
    backdrop.hidden = true;
    selectedId = null;
    currentDetail = null;
    detailHistory = [];
    updateBackControl();
    applySearchAndSelection();
    status.textContent = "Details closed.";
    if (detailReturnFocus?.isConnected) detailReturnFocus.focus();
    detailReturnFocus = null;
  }

  function clearSelection() {
    selectedId = null;
    if (!panel.hidden) closeDetail();
    else applySearchAndSelection();
  }

  function fitToContent(animate = true) {
    if (!currentNodes.length) return;
    const xs = currentNodes.map(node => node.x).filter(Number.isFinite);
    const ys = currentNodes.map(node => node.y).filter(Number.isFinite);
    if (!xs.length || !ys.length) return;
    const bounds = [[d3.min(xs) - 90, d3.min(ys) - 110], [d3.max(xs) + 90, d3.max(ys) + 110]];
    const dx = bounds[1][0] - bounds[0][0];
    const dy = bounds[1][1] - bounds[0][1];
    const scale = Math.max(.18, Math.min(1.15, .88 / Math.max(dx / width, dy / height)));
    const tx = width / 2 - scale * (bounds[0][0] + bounds[1][0]) / 2;
    const ty = height / 2 - scale * (bounds[0][1] + bounds[1][1]) / 2;
    const target = d3.zoomIdentity.translate(tx, ty).scale(scale);
    const selection = animate && !reducedMotion ? svg.transition().duration(650) : svg;
    selection.call(zoom.transform, target);
  }

  function focusTimelineStart(trackY) {
    const scale = width < 520 ? .62 : .72;
    const target = d3.zoomIdentity
      .translate(36 - scale * 70, height / 2 - scale * trackY)
      .scale(scale);
    const selection = reducedMotion ? svg : svg.transition().duration(500);
    selection.call(zoom.transform, target);
  }

  function focusWebCenter(animate = true) {
    const xs = currentNodes.map(node => node.x).filter(Number.isFinite);
    const ys = currentNodes.map(node => node.y).filter(Number.isFinite);
    if (!xs.length || !ys.length) return;
    const centerX = (d3.min(xs) + d3.max(xs)) / 2;
    const centerY = (d3.min(ys) + d3.max(ys)) / 2;
    const scale = width < 700 ? .34 : .40;
    const target = d3.zoomIdentity.translate(width / 2 - scale * centerX, height / 2 - scale * centerY).scale(scale);
    const selection = !animate || reducedMotion ? svg : svg.transition().duration(500);
    selection.call(zoom.transform, target);
  }

  function resize() {
    const rect = mapElement.getBoundingClientRect();
    width = Math.max(320, rect.width);
    height = Math.max(480, rect.height);
    svg.attr("viewBox", `0 0 ${width} ${height}`);
    if (layout === "timeline") draw();
    else ticked();
  }

  function setLayout(nextLayout) {
    layout = nextLayout;
    const isWeb = layout === "web";
    document.getElementById("web-view").classList.toggle("active", isWeb);
    document.getElementById("timeline-view").classList.toggle("active", !isWeb);
    document.getElementById("web-view").setAttribute("aria-pressed", String(isWeb));
    document.getElementById("timeline-view").setAttribute("aria-pressed", String(!isWeb));
    draw();
    applySearchAndSelection();
    status.textContent = isWeb ? "Constellation layout active." : "Chronological timeline layout active.";
  }

  function formatWatchDate(movie) {
    if (!movie.watchedDate) {
      if (movie.dateConfidence === "current") return "Current punishment movie";
      return "Punishment date not recorded";
    }
    const prefix = movie.dateConfidence === "estimated" ? "≈ " : "Watched ";
    return `${prefix}${dateFormatter.format(new Date(`${movie.watchedDate}T12:00:00`))}${movie.dateConfidence === "estimated" ? " · reconstructed" : ""}`;
  }
  function formatShortDate(movie) {
    if (!movie.watchedDate) return movie.category === "punishment" ? "PUNISHMENT" : "DATE UNKNOWN";
    const [year, month, day] = movie.watchedDate.split("-");
    return `${movie.dateConfidence === "estimated" ? "≈ " : ""}${day}/${month}/${year.slice(2)}`;
  }
  function dateValue(movie) { return movie.watchedDate ? new Date(`${movie.watchedDate}T12:00:00`).getTime() : Date.UTC(2026, 11, 1) + movie.title.charCodeAt(0); }
  function ellipsize(value, max) { return value.length > max ? `${value.slice(0, max - 1)}…` : value; }
  function element(tag, text) { const node = document.createElement(tag); node.textContent = text; return node; }

  document.querySelectorAll("#category-filters input, #relation-filters input").forEach(input => input.addEventListener("change", rebuild));
  document.getElementById("search").addEventListener("input", event => { searchTerm = event.target.value; selectedId = null; applySearchAndSelection(); });
  document.getElementById("web-view").addEventListener("click", () => setLayout("web"));
  document.getElementById("timeline-view").addEventListener("click", () => setLayout("timeline"));
  document.getElementById("reset-view").addEventListener("click", () => {
    searchTerm = ""; selectedId = null; currentDetail = null; detailHistory = []; savedPositions.clear(); document.getElementById("search").value = ""; panel.hidden = true; backdrop.hidden = true; updateBackControl(); applySearchAndSelection(); if (layout === "web") draw(); else fitToContent();
  });
  document.getElementById("detail-back").addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    const previous = detailHistory.pop();
    if (previous) navigateDetail(previous.kind, previous.id, false);
  });
  const closeButton = document.getElementById("close-detail");
  const closeFromControl = event => {
    event.preventDefault();
    event.stopPropagation();
    closeDetail();
  };
  closeButton.addEventListener("pointerup", closeFromControl);
  closeButton.addEventListener("click", closeFromControl);
  document.addEventListener("pointerdown", event => {
    if (panel.hidden) return;
    const bounds = closeButton.getBoundingClientRect();
    if (event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom) {
      closeFromControl(event);
    }
  }, true);
  document.addEventListener("click", event => {
    if (!panel.hidden && event.target.closest?.("#close-detail")) closeFromControl(event);
  }, true);
  backdrop.addEventListener("pointerup", clearSelection);
  svg.on("click.clear-selection", event => {
    if (!event.target.closest(".graph-node")) clearSelection();
  });
  mapElement.addEventListener("pointerup", event => {
    if (event.target === mapElement) clearSelection();
  });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && !panel.hidden) closeDetail(); });
  window.closeChunkplayerDetail = closeDetail;

  new ResizeObserver(resize).observe(mapElement);
  resize();
  rebuild();
})();
