(function () {
  "use strict";

  const archive = window.CHUNKPLAYER_ARCHIVE;
  const chooserByMovie = archive.chooserByMovie || {};
  const movies = archive.movies.map(movie => ({
    ...movie,
    kind: "movie",
    chosenBy: chooserByMovie[movie.id] || null,
    chunkCount: chunkCountForRuntime(movie.runtime)
  }));
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
  const controlsToggle = document.getElementById("controls-toggle");
  const controlsPanel = document.getElementById("archive-controls");
  let width = 1200;
  let height = 700;
  let layout = "web";
  let selectedId = null;
  let searchTerm = "";
  let currentNodes = [];
  let currentLinks = [];
  let detailReturnFocus = null;
  let currentDetail = null;
  let detailHistory = [];
  let pinchGestureActive = false;
  let suppressMapClicksUntil = 0;
  const savedPositions = new Map();

  function trackTouchGesture(event) {
    if (event.touches.length >= 2) {
      pinchGestureActive = true;
      suppressMapClicksUntil = Number.POSITIVE_INFINITY;
    }
  }

  function finishTouchGesture(event) {
    if (!pinchGestureActive) return;
    suppressMapClicksUntil = performance.now() + 500;
    if (event.touches.length === 0) pinchGestureActive = false;
  }

  function suppressSelectionForGesture() {
    return pinchGestureActive || performance.now() < suppressMapClicksUntil;
  }

  const svgElement = svg.node();
  svgElement.addEventListener("touchstart", trackTouchGesture, { capture: true, passive: true });
  svgElement.addEventListener("touchmove", trackTouchGesture, { capture: true, passive: true });
  svgElement.addEventListener("touchend", finishTouchGesture, { capture: true, passive: true });
  svgElement.addEventListener("touchcancel", finishTouchGesture, { capture: true, passive: true });

  const zoom = d3.zoom()
    .scaleExtent([0.18, 3.5])
    .filter(event => event.type.startsWith("touch") || !event.target.closest || !event.target.closest(".movie-node, .hub-node"))
    .on("zoom", event => viewport.attr("transform", event.transform));
  svg.call(zoom).on("dblclick.zoom", null);

  document.getElementById("movie-count").textContent = movies.length;
  document.getElementById("connection-count").textContent = allLinks.length;
  const dated = movies.filter(movie => movie.watchedDate).map(movie => movie.watchedDate).sort();
  document.getElementById("year-span").textContent = dated.length ? `${dated[0].slice(0, 4)}–${dated.at(-1).slice(0, 4)}` : "—";
  const archiveAge = dated.length ? formatCalendarDuration(dated[0], new Date()) : "—";
  document.getElementById("archive-age").textContent = archiveAge;
  if (dated.length) {
    const firstChunkDate = dateFormatter.format(new Date(`${dated[0]}T12:00:00`));
    document.getElementById("archive-age-stat").title = `Elapsed time from ${firstChunkDate} to today`;
    document.getElementById("archive-age-stat").setAttribute("aria-label", `${archiveAge} since the first chunk on ${firstChunkDate}`);
  }
  const totalRuntime = movies.reduce((sum, movie) => sum + (Number.isFinite(movie.runtime) ? movie.runtime : 0), 0);
  const totalChunks = movies.reduce((sum, movie) => sum + (movie.chunkCount || 0), 0);
  document.getElementById("runtime-total").textContent = formatRuntime(totalRuntime);
  document.getElementById("chunk-total").textContent = totalChunks.toLocaleString("en-NZ");
  document.getElementById("runtime-stat").setAttribute("aria-label", `${totalRuntime.toLocaleString("en-NZ")} minutes total runtime`);
  document.getElementById("chunk-stat").setAttribute("aria-label", `${totalChunks.toLocaleString("en-NZ")} total chunks`);

  function chunkCountForRuntime(runtime) {
    return Number.isFinite(runtime) ? Math.floor(runtime / 5) : null;
  }

  function formatRuntime(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
  }

  function formatCalendarDuration(startDateString, endDate) {
    const [startYear, startMonth, startDay] = startDateString.split("-").map(Number);
    const start = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    let years = end.getFullYear() - start.getFullYear();
    let cursor = addCalendarYears(start, years);
    if (cursor > end) {
      years -= 1;
      cursor = addCalendarYears(start, years);
    }
    let months = (end.getFullYear() - cursor.getFullYear()) * 12 + end.getMonth() - cursor.getMonth();
    let monthCursor = addCalendarMonths(cursor, months);
    if (monthCursor > end) {
      months -= 1;
      monthCursor = addCalendarMonths(cursor, months);
    }
    const days = dayNumber(end) - dayNumber(monthCursor);
    return [durationPart(years, "year"), durationPart(months, "month"), durationPart(days, "day")].join(", ");
  }

  function addCalendarYears(date, years) {
    const year = date.getFullYear() + years;
    return new Date(year, date.getMonth(), Math.min(date.getDate(), daysInMonth(year, date.getMonth())));
  }

  function addCalendarMonths(date, months) {
    const monthIndex = date.getMonth() + months;
    const year = date.getFullYear() + Math.floor(monthIndex / 12);
    const month = ((monthIndex % 12) + 12) % 12;
    return new Date(year, month, Math.min(date.getDate(), daysInMonth(year, month)));
  }

  function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
  function dayNumber(date) { return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000); }
  function durationPart(value, unit) { return `${value} ${unit}${value === 1 ? "" : "s"}`; }

  function setControlsExpanded(expanded, announce = false) {
    controlsPanel.hidden = !expanded;
    controlsToggle.setAttribute("aria-expanded", String(expanded));
    const action = expanded ? "Hide" : "Show";
    controlsToggle.setAttribute("aria-label", `${action} filters and layout controls`);
    controlsToggle.title = `${action} filters and layout controls`;
    if (announce) status.textContent = `Map controls ${expanded ? "expanded" : "collapsed"}.`;
  }

  setControlsExpanded(!matchMedia("(max-width: 720px)").matches);

  function checkedValues(selector) {
    return new Set(Array.from(document.querySelectorAll(`${selector} input:checked`)).map(input => input.value));
  }

  function rebuild() {
    const categories = checkedValues("#category-filters");
    const choosers = checkedValues("#chooser-filters");
    const relations = checkedValues("#relation-filters");
    const visibleMovies = movies.filter(movie =>
      categories.has(movie.category) &&
      (!movie.chosenBy || choosers.has(movie.chosenBy))
    );
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
    status.textContent = layout === "web"
      ? `${visibleMovies.length} titles and ${links.length} relationship lines shown.`
      : `${visibleMovies.length} titles shown in ${layout === "release" ? "release" : "watch"} order.`;
  }

  function draw() {
    linkLayer.selectAll("line")
      .data(currentLinks, link => link.id)
      .join(
        enter => enter.append("line")
          .attr("class", link => `link ${link.type}`)
          .attr("stroke", link => relationColors[link.type])
          .attr("stroke-width", 1.5)
          .attr("data-source", link => link.sourceId)
          .attr("data-target", link => link.targetId),
        update => update
          .attr("class", link => `link ${link.type}`)
          .attr("data-source", link => link.sourceId)
          .attr("data-target", link => link.targetId),
        exit => exit.remove()
      );

    const nodeJoin = nodeLayer.selectAll("g.graph-node")
      .data(currentNodes, node => node.id)
      .join(
        enter => {
          const group = enter.append("g")
            .attr("class", node => {
              if (node.kind !== "movie") return `graph-node hub-node ${node.type}`;
              const chooserClass = node.chosenBy ? `chooser-${node.chosenBy}` : "chooser-unassigned";
              return `graph-node movie-node ${node.category} ${chooserClass}`;
            })
            .attr("role", "button")
            .attr("tabindex", 0)
            .attr("data-node-id", node => node.id)
            .attr("aria-label", node => node.kind === "movie" ? `${node.title}, ${node.releaseYear}` : `${node.label} connection`)
            .on("click", (event, node) => {
              if (suppressSelectionForGesture()) {
                event.preventDefault();
                event.stopPropagation();
                return;
              }
              selectNode(node);
            })
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

    nodeJoin.filter(node => node.kind === "movie")
      .select(".node-date")
      .text(movie => formatNodeSubtitle(movie));

    if (layout === "web") positionConstellations(nodeJoin);
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
    group.append("text").attr("class", "node-date").attr("y", 94).text(formatNodeSubtitle(movie));
    group.append("circle").attr("cx", 35).attr("cy", -55).attr("r", 5).attr("fill", categoryColors[movie.category]).attr("stroke", "#070816").attr("stroke-width", 1.5);
  }

  function drawHubNode(group, hubNode) {
    group.append("circle").attr("r", 27);
    const words = hubNode.label.split(" ");
    const lines = words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")] : [hubNode.label];
    group.selectAll("text").data(lines).join("text").attr("y", (_, index) => (index - (lines.length - 1) / 2) * 11 + 3).text(line => ellipsize(line, 16));
  }

  function positionConstellations(nodeJoin) {
    axisLayer.selectAll("*").remove();
    linkLayer.attr("display", null);
    nodeJoin.attr("display", null);
    const constellations = connectedComponents().map((nodes, index) => layoutConstellation(nodes, index));
    packConstellations(constellations);
    currentNodes.forEach(node => {
      const saved = savedPositions.get(node.id);
      if (saved?.constellationKey === node.constellationKey) {
        node.x = saved.x;
        node.y = saved.y;
      }
    });
    nodeJoin.attr("data-constellation", node => node.constellationIndex);
    linkLayer.selectAll("line").attr("data-constellation", link => link.source.constellationIndex);
    ticked();
    focusWebCenter(false);
    nodeJoin.call(d3.drag()
      .filter(event => !event.touches && event.button === 0)
      .on("drag", (event, node) => { node.x = event.x; node.y = event.y; ticked(); })
      .on("end", (_, node) => { savedPositions.set(node.id, { x: node.x, y: node.y, constellationKey: node.constellationKey }); }));
  }

  function connectedComponents() {
    const nodeById = new Map(currentNodes.map(node => [node.id, node]));
    const neighbors = new Map(currentNodes.map(node => [node.id, new Set()]));
    currentLinks.forEach(link => {
      neighbors.get(link.sourceId)?.add(link.targetId);
      neighbors.get(link.targetId)?.add(link.sourceId);
    });
    const seen = new Set();
    const components = [];
    currentNodes.forEach(startNode => {
      if (seen.has(startNode.id)) return;
      const stack = [startNode.id];
      const nodes = [];
      seen.add(startNode.id);
      while (stack.length) {
        const nodeId = stack.pop();
        nodes.push(nodeById.get(nodeId));
        neighbors.get(nodeId)?.forEach(neighborId => {
          if (seen.has(neighborId)) return;
          seen.add(neighborId);
          stack.push(neighborId);
        });
      }
      components.push(nodes);
    });
    return components.sort((a, b) => b.length - a.length || componentName(a).localeCompare(componentName(b)));
  }

  function componentName(nodes) {
    return nodes.filter(node => node.kind === "movie").map(node => node.title).sort()[0] || nodes[0]?.label || "";
  }

  function layoutConstellation(nodes, constellationIndex) {
    const nodeIds = new Set(nodes.map(node => node.id));
    const links = currentLinks.filter(link => nodeIds.has(link.sourceId) && nodeIds.has(link.targetId));
    const movies = nodes.filter(node => node.kind === "movie").sort((a, b) => a.title.localeCompare(b.title));
    const hubs = nodes.filter(node => node.kind === "hub").sort((a, b) => a.label.localeCompare(b.label));
    const key = nodes.map(node => node.id).sort().join("|");

    if (nodes.length === 1) {
      nodes[0].x = 0;
      nodes[0].y = 0;
    } else {
      const movieRadius = Math.max(170, movies.length * 29);
      const hubRadius = Math.max(72, hubs.length * 10);
      movies.forEach((node, index) => {
        const angle = Math.PI * 2 * index / movies.length - Math.PI / 2;
        node.x = Math.cos(angle) * movieRadius;
        node.y = Math.sin(angle) * movieRadius * .72;
      });
      hubs.forEach((node, index) => {
        const angle = Math.PI * 2 * index / hubs.length - Math.PI / 2 + .35;
        node.x = Math.cos(angle) * hubRadius;
        node.y = Math.sin(angle) * hubRadius * .72;
      });
      const componentSimulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(node => node.id).distance(link => link.type === "person" ? 205 : 230).strength(.72))
        .force("charge", d3.forceManyBody().strength(node => node.kind === "movie" ? -820 : -330))
        .force("line-clearance", forceLineClearance(links))
        .force("rectangle-collision", forceRectangleCollision(16))
        .force("x", d3.forceX(0).strength(.035))
        .force("y", d3.forceY(0).strength(.035))
        .velocityDecay(.58)
        .stop();
      for (let tick = 0; tick < 320; tick += 1) componentSimulation.tick();
      settleConstellationGeometry(nodes, links);
    }

    nodes.forEach(node => {
      node.constellationIndex = constellationIndex;
      node.constellationKey = key;
    });
    const padding = nodes.length === 1 ? 58 : 125;
    const contentMinX = d3.min(nodes, node => node.x - (node.kind === "movie" ? 58 : 38));
    const contentMaxX = d3.max(nodes, node => node.x + (node.kind === "movie" ? 58 : 38));
    const contentMinY = d3.min(nodes, node => node.y - (node.kind === "movie" ? 108 : 38));
    const contentMaxY = d3.max(nodes, node => node.y + (node.kind === "movie" ? 108 : 38));
    const minX = contentMinX - padding;
    const minY = contentMinY - padding;
    return {
      nodes,
      minX,
      minY,
      width: contentMaxX - contentMinX + padding * 2,
      height: contentMaxY - contentMinY + padding * 2,
      contentMinX,
      contentMinY,
      contentWidth: contentMaxX - contentMinX,
      contentHeight: contentMaxY - contentMinY,
      constellationIndex
    };
  }

  function forceLineClearance(links) {
    let nodes = [];
    function force(alpha) {
      links.forEach(link => {
        const source = link.source;
        const target = link.target;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const lengthSquared = dx * dx + dy * dy || 1;
        nodes.forEach(node => {
          if (node === source || node === target) return;
          const projection = ((node.x - source.x) * dx + (node.y - source.y) * dy) / lengthSquared;
          if (projection <= .08 || projection >= .92) return;
          const closestX = source.x + projection * dx;
          const closestY = source.y + projection * dy;
          let offsetX = node.x - closestX;
          let offsetY = node.y - closestY;
          let distance = Math.hypot(offsetX, offsetY);
          const clearance = node.kind === "movie" ? 116 : 50;
          if (distance >= clearance) return;
          if (distance < .001) {
            const direction = node.id.localeCompare(source.id) < 0 ? -1 : 1;
            offsetX = -dy * direction;
            offsetY = dx * direction;
            distance = Math.hypot(offsetX, offsetY) || 1;
          }
          const push = (clearance - distance) * alpha * .7;
          node.vx += offsetX / distance * push;
          node.vy += offsetY / distance * push;
        });
      });
    }
    force.initialize = componentNodes => { nodes = componentNodes; };
    return force;
  }

  function forceRectangleCollision(padding) {
    let nodes = [];
    function force(alpha) {
      for (let pass = 0; pass < 3; pass += 1) {
        for (let firstIndex = 0; firstIndex < nodes.length; firstIndex += 1) {
          const first = nodes[firstIndex];
          const firstHalfWidth = first.kind === "movie" ? 58 : 38;
          const firstHalfHeight = first.kind === "movie" ? 108 : 38;
          for (let secondIndex = firstIndex + 1; secondIndex < nodes.length; secondIndex += 1) {
            const second = nodes[secondIndex];
            const secondHalfWidth = second.kind === "movie" ? 58 : 38;
            const secondHalfHeight = second.kind === "movie" ? 108 : 38;
            const deltaX = second.x - first.x;
            const deltaY = second.y - first.y;
            const requiredX = firstHalfWidth + secondHalfWidth + padding;
            const requiredY = firstHalfHeight + secondHalfHeight + padding;
            const overlapX = requiredX - Math.abs(deltaX);
            const overlapY = requiredY - Math.abs(deltaY);
            if (overlapX <= 0 || overlapY <= 0) continue;
            if (overlapX / requiredX < overlapY / requiredY) {
              const direction = deltaX === 0 ? (first.id.localeCompare(second.id) < 0 ? 1 : -1) : Math.sign(deltaX);
              const push = overlapX * alpha * .58;
              first.vx -= direction * push;
              second.vx += direction * push;
            } else {
              const direction = deltaY === 0 ? (first.id.localeCompare(second.id) < 0 ? 1 : -1) : Math.sign(deltaY);
              const push = overlapY * alpha * .58;
              first.vy -= direction * push;
              second.vy += direction * push;
            }
          }
        }
      }
    }
    force.initialize = componentNodes => { nodes = componentNodes; };
    return force;
  }

  function settleConstellationGeometry(nodes, links) {
    for (let pass = 0; pass < 180; pass += 1) {
      let movement = resolveRectangleOverlaps(nodes, 14);

      links.forEach(link => {
        const source = link.source;
        const target = link.target;
        const deltaX = target.x - source.x;
        const deltaY = target.y - source.y;
        const lengthSquared = deltaX * deltaX + deltaY * deltaY || 1;
        nodes.forEach(node => {
          if (node === source || node === target) return;
          const projection = ((node.x - source.x) * deltaX + (node.y - source.y) * deltaY) / lengthSquared;
          if (projection <= .06 || projection >= .94) return;
          const closestX = source.x + projection * deltaX;
          const closestY = source.y + projection * deltaY;
          let offsetX = node.x - closestX;
          let offsetY = node.y - closestY;
          let distance = Math.hypot(offsetX, offsetY);
          const clearance = node.kind === "movie" ? 96 : 42;
          if (distance >= clearance) return;
          if (distance < .001) {
            const direction = node.id.localeCompare(source.id) < 0 ? -1 : 1;
            offsetX = -deltaY * direction;
            offsetY = deltaX * direction;
            distance = Math.hypot(offsetX, offsetY) || 1;
          }
          const push = (clearance - distance) * .72 + .25;
          node.x += offsetX / distance * push;
          node.y += offsetY / distance * push;
          movement += push;
        });
      });
      if (movement < .05) break;
    }
    for (let pass = 0; pass < 80; pass += 1) {
      if (resolveRectangleOverlaps(nodes, 14) < .05) break;
    }

    const centerX = d3.mean(nodes, node => node.x) || 0;
    const centerY = d3.mean(nodes, node => node.y) || 0;
    nodes.forEach(node => {
      node.x -= centerX;
      node.y -= centerY;
    });
  }

  function resolveRectangleOverlaps(nodes, padding) {
    let movement = 0;
    for (let firstIndex = 0; firstIndex < nodes.length; firstIndex += 1) {
      const first = nodes[firstIndex];
      const firstHalfWidth = first.kind === "movie" ? 58 : 38;
      const firstHalfHeight = first.kind === "movie" ? 108 : 38;
      for (let secondIndex = firstIndex + 1; secondIndex < nodes.length; secondIndex += 1) {
        const second = nodes[secondIndex];
        const secondHalfWidth = second.kind === "movie" ? 58 : 38;
        const secondHalfHeight = second.kind === "movie" ? 108 : 38;
        const deltaX = second.x - first.x;
        const deltaY = second.y - first.y;
        const requiredX = firstHalfWidth + secondHalfWidth + padding;
        const requiredY = firstHalfHeight + secondHalfHeight + padding;
        const overlapX = requiredX - Math.abs(deltaX);
        const overlapY = requiredY - Math.abs(deltaY);
        if (overlapX <= 0 || overlapY <= 0) continue;
        if (overlapX / requiredX < overlapY / requiredY) {
          const direction = deltaX === 0 ? (first.id.localeCompare(second.id) < 0 ? 1 : -1) : Math.sign(deltaX);
          const push = overlapX / 2 + .5;
          first.x -= direction * push;
          second.x += direction * push;
          movement += push * 2;
        } else {
          const direction = deltaY === 0 ? (first.id.localeCompare(second.id) < 0 ? 1 : -1) : Math.sign(deltaY);
          const push = overlapY / 2 + .5;
          first.y -= direction * push;
          second.y += direction * push;
          movement += push * 2;
        }
      }
    }
    return movement;
  }

  function packConstellations(constellations) {
    if (!constellations.length) return;
    const main = constellations[0];
    const mainCircle = constellationBoundingCircle(main);
    moveConstellationCircle(main, mainCircle, 0, 0);
    const satellites = distributeSatelliteSizes(constellations.slice(1).map(constellation => ({
      constellation,
      circle: constellationBoundingCircle(constellation)
    })));
    if (!satellites.length) return;

    let ringGap = 28;
    let separations = satelliteAngularSeparations(satellites, mainCircle.r, ringGap);
    while (d3.sum(separations) > Math.PI * 2 && ringGap < mainCircle.r) {
      ringGap += 12;
      separations = satelliteAngularSeparations(satellites, mainCircle.r, ringGap);
    }

    const spareAngle = Math.max(0, Math.PI * 2 - d3.sum(separations)) / satellites.length;
    let angle = -Math.PI * .72;
    satellites.forEach((satellite, index) => {
      const orbitRadius = mainCircle.r + ringGap + satellite.circle.r;
      const centerX = Math.cos(angle) * orbitRadius;
      const centerY = Math.sin(angle) * orbitRadius;
      moveConstellationCircle(satellite.constellation, satellite.circle, centerX, centerY);
      angle += separations[index] + spareAngle;
    });
  }

  function moveConstellationCircle(constellation, circle, centerX, centerY) {
    const offsetX = centerX - circle.x;
    const offsetY = centerY - circle.y;
    constellation.nodes.forEach(node => {
      node.x += offsetX;
      node.y += offsetY;
    });
  }

  function distributeSatelliteSizes(satellites) {
    const clusters = satellites.filter(item => item.constellation.nodes.length > 1);
    const singletons = satellites.filter(item => item.constellation.nodes.length === 1);
    if (!clusters.length) return singletons;
    const distributed = [];
    let singletonIndex = 0;
    clusters.forEach((cluster, index) => {
      distributed.push(cluster);
      const singletonTarget = Math.floor((index + 1) * singletons.length / clusters.length);
      while (singletonIndex < singletonTarget) distributed.push(singletons[singletonIndex++]);
    });
    return distributed.concat(singletons.slice(singletonIndex));
  }

  function satelliteAngularSeparations(satellites, mainRadius, ringGap) {
    return satellites.map((satellite, index) => {
      const next = satellites[(index + 1) % satellites.length];
      const firstOrbit = mainRadius + ringGap + satellite.circle.r;
      const secondOrbit = mainRadius + ringGap + next.circle.r;
      const requiredDistance = satellite.circle.r + next.circle.r + 18;
      const cosine = (firstOrbit * firstOrbit + secondOrbit * secondOrbit - requiredDistance * requiredDistance) /
        (2 * firstOrbit * secondOrbit);
      return Math.acos(Math.max(-1, Math.min(1, cosine)));
    });
  }

  function constellationBoundingCircle(constellation) {
    const points = constellation.nodes.flatMap(node => {
      const halfWidth = node.kind === "movie" ? 58 : 38;
      const halfHeight = node.kind === "movie" ? 108 : 38;
      return [
        { x: node.x - halfWidth, y: node.y - halfHeight },
        { x: node.x + halfWidth, y: node.y - halfHeight },
        { x: node.x + halfWidth, y: node.y + halfHeight },
        { x: node.x - halfWidth, y: node.y + halfHeight }
      ];
    });
    return minimumEnclosingCircle(points);
  }

  function minimumEnclosingCircle(points) {
    const ordered = [...points].sort((first, second) => first.x - second.x || first.y - second.y);
    let circle = null;
    ordered.forEach((point, index) => {
      if (!circle || !circleContains(circle, point)) {
        circle = minimumCircleWithPoint(ordered.slice(0, index + 1), point);
      }
    });
    return circle || { x: 0, y: 0, r: 0 };
  }

  function minimumCircleWithPoint(points, boundaryPoint) {
    let circle = { x: boundaryPoint.x, y: boundaryPoint.y, r: 0 };
    points.forEach((point, index) => {
      if (circleContains(circle, point)) return;
      circle = circle.r === 0
        ? diameterCircle(boundaryPoint, point)
        : minimumCircleWithTwoPoints(points.slice(0, index + 1), boundaryPoint, point);
    });
    return circle;
  }

  function minimumCircleWithTwoPoints(points, firstBoundary, secondBoundary) {
    const diameter = diameterCircle(firstBoundary, secondBoundary);
    let leftCircle = null;
    let rightCircle = null;
    points.forEach(point => {
      if (circleContains(diameter, point)) return;
      const side = crossProduct(firstBoundary, secondBoundary, point);
      const circle = circumcircle(firstBoundary, secondBoundary, point);
      if (!circle) return;
      const centerSide = crossProduct(firstBoundary, secondBoundary, circle);
      if (side > 0 && (!leftCircle || centerSide > crossProduct(firstBoundary, secondBoundary, leftCircle))) leftCircle = circle;
      if (side < 0 && (!rightCircle || centerSide < crossProduct(firstBoundary, secondBoundary, rightCircle))) rightCircle = circle;
    });
    if (!leftCircle && !rightCircle) return diameter;
    if (!leftCircle) return rightCircle;
    if (!rightCircle) return leftCircle;
    return leftCircle.r <= rightCircle.r ? leftCircle : rightCircle;
  }

  function diameterCircle(first, second) {
    const x = (first.x + second.x) / 2;
    const y = (first.y + second.y) / 2;
    return { x, y, r: Math.hypot(first.x - second.x, first.y - second.y) / 2 };
  }

  function circumcircle(first, second, third) {
    const determinant = (first.x * (second.y - third.y) + second.x * (third.y - first.y) + third.x * (first.y - second.y)) * 2;
    if (Math.abs(determinant) < 1e-8) return null;
    const firstLength = first.x * first.x + first.y * first.y;
    const secondLength = second.x * second.x + second.y * second.y;
    const thirdLength = third.x * third.x + third.y * third.y;
    const x = (firstLength * (second.y - third.y) + secondLength * (third.y - first.y) + thirdLength * (first.y - second.y)) / determinant;
    const y = (firstLength * (third.x - second.x) + secondLength * (first.x - third.x) + thirdLength * (second.x - first.x)) / determinant;
    return { x, y, r: Math.hypot(x - first.x, y - first.y) };
  }

  function crossProduct(first, second, point) {
    return (second.x - first.x) * (point.y - first.y) - (second.y - first.y) * (point.x - first.x);
  }

  function circleContains(circle, point) {
    return Math.hypot(point.x - circle.x, point.y - circle.y) <= circle.r + 1e-6;
  }

  function positionTimeline(nodeJoin) {
    nodeJoin.on(".drag", null);
    linkLayer.interrupt().attr("display", "none");
    nodeJoin.filter(node => node.kind === "hub").interrupt().attr("display", "none");
    const movieJoin = nodeJoin.filter(node => node.kind === "movie").attr("display", null);
    const isReleaseOrder = layout === "release";
    const movieNodes = currentNodes.filter(node => node.kind === "movie").sort((a, b) => {
      if (isReleaseOrder) return a.releaseYear - b.releaseYear || a.title.localeCompare(b.title);
      return dateValue(a) - dateValue(b) || a.title.localeCompare(b.title);
    });
    const startX = 150;
    const spacing = 150;
    const trackY = Math.max(180, height * .48);
    movieNodes.forEach((node, index) => {
      node.x = startX + index * spacing;
      node.y = trackY;
    });
    const duration = reducedMotion ? 0 : 700;
    movieJoin.transition().duration(duration).attr("transform", node => `translate(${node.x},${node.y})`);
    drawTimelineAxis(movieNodes, trackY, startX, spacing, isReleaseOrder);
    setTimeout(() => focusTimelineStart(trackY), duration + 30);
  }

  function drawTimelineAxis(movieNodes, trackY, startX, spacing, isReleaseOrder) {
    axisLayer.selectAll("*").remove();
    if (!movieNodes.length) return;
    const axisY = trackY + 122;
    axisLayer.append("line").attr("class", "timeline-line").attr("x1", startX - 60).attr("x2", startX + (movieNodes.length - 1) * spacing + 60).attr("y1", axisY).attr("y2", axisY);
    const yearForMovie = movie => isReleaseOrder ? String(movie.releaseYear) : movie.watchedDate?.slice(0, 4);
    const years = d3.groups(movieNodes.filter(movie => yearForMovie(movie)), yearForMovie);
    years.forEach(([year, entries]) => {
      const x = d3.mean(entries, entry => entry.x);
      axisLayer.append("line").attr("class", "timeline-tick").attr("x1", x).attr("x2", x).attr("y1", axisY - 10).attr("y2", axisY + 10);
      axisLayer.append("text").attr("class", "timeline-label").attr("x", x).attr("y", axisY + 27).text(year);
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
    const fitNodes = layout === "web" ? currentNodes : currentNodes.filter(node => node.kind === "movie");
    if (!fitNodes.length) return;
    const xs = fitNodes.map(node => node.x).filter(Number.isFinite);
    const ys = fitNodes.map(node => node.y).filter(Number.isFinite);
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
    const scale = width < 700 ? .4 : .6;
    const target = d3.zoomIdentity.translate(width / 2 - scale * centerX, height / 2 - scale * centerY).scale(scale);
    const selection = !animate || reducedMotion ? svg : svg.transition().duration(500);
    selection.call(zoom.transform, target);
  }

  function resize() {
    const rect = mapElement.getBoundingClientRect();
    width = Math.max(320, rect.width);
    height = Math.max(480, rect.height);
    svg.attr("viewBox", `0 0 ${width} ${height}`);
    if (layout !== "web") draw();
    else ticked();
  }

  function setLayout(nextLayout) {
    layout = nextLayout;
    const layoutButtons = { web: "web-view", timeline: "timeline-view", release: "release-view" };
    Object.entries(layoutButtons).forEach(([buttonLayout, buttonId]) => {
      const active = layout === buttonLayout;
      const button = document.getElementById(buttonId);
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    draw();
    applySearchAndSelection();
    const messages = {
      web: "Constellation layout active.",
      timeline: "Watch-order timeline active.",
      release: "Release-order timeline active."
    };
    status.textContent = messages[layout];
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
  function formatNodeSubtitle(movie) { return layout === "release" ? `RELEASED ${movie.releaseYear}` : formatShortDate(movie); }
  function dateValue(movie) { return movie.watchedDate ? new Date(`${movie.watchedDate}T12:00:00`).getTime() : Date.UTC(2026, 11, 1) + movie.title.charCodeAt(0); }
  function ellipsize(value, max) { return value.length > max ? `${value.slice(0, max - 1)}…` : value; }
  function element(tag, text) { const node = document.createElement(tag); node.textContent = text; return node; }

  document.querySelectorAll("#category-filters input, #chooser-filters input, #relation-filters input").forEach(input => input.addEventListener("change", rebuild));
  controlsToggle.addEventListener("click", () => setControlsExpanded(controlsToggle.getAttribute("aria-expanded") !== "true", true));
  document.getElementById("search").addEventListener("input", event => { searchTerm = event.target.value; selectedId = null; applySearchAndSelection(); });
  document.getElementById("web-view").addEventListener("click", () => setLayout("web"));
  document.getElementById("timeline-view").addEventListener("click", () => setLayout("timeline"));
  document.getElementById("release-view").addEventListener("click", () => setLayout("release"));
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
    if (suppressSelectionForGesture()) return;
    if (!event.target.closest(".graph-node")) clearSelection();
  });
  mapElement.addEventListener("pointerup", event => {
    if (suppressSelectionForGesture()) return;
    if (event.target === mapElement) clearSelection();
  });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && !panel.hidden) closeDetail(); });
  window.closeChunkplayerDetail = closeDetail;

  new ResizeObserver(resize).observe(mapElement);
  resize();
  rebuild();
})();
