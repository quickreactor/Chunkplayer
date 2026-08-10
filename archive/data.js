/* Canonical, browser-local research data. No fetch is used so the map works from file://. */
window.CHUNKPLAYER_ARCHIVE = {
  generated: "2026-08-10",
  chooserByMovie: {
    "unfrosted": "barnaby",
    "madame-web": "tom",
    "pinocchio": "robert",
    "golden-arm": "interlude",
    "hundreds-of-beavers": "tom",
    "ball-of-twine": "interlude",
    "hard-ticket-to-hawaii": "barnaby",
    "bedtime-stories": "robert",
    "trancers-5": "tom",
    "chopping-mall": "barnaby",
    "the-mask": "robert",
    "shakma": "tom",
    "better-off-dead": "barnaby",
    "electric-dreams": "robert",
    "the-stunt-man": "tom",
    "lifeforce": "barnaby",
    "lethal-weapon": "robert",
    "com-for-murder": "tom",
    "uninvited": "barnaby",
    "dragonball-evolution": "robert",
    "the-fury": "tom",
    "champagne-and-bullets": "barnaby",
    "tammy-and-the-t-rex": "robert",
    "innerspace": "tom",
    "maximum-overdrive": "barnaby",
    "toxic-avenger": "robert",
    "the-fanatic": "tom",
    "emmas-boy": "barnaby",
    "buckaroo-banzai": "robert",
    "police-story": "tom",
    "live-wire": "barnaby",
    "good-luck-have-fun-dont-die": "robert",
    "the-dead-zone": "tom",
    "the-napa-boys": "barnaby",
    "cherry-2000": "robert",
    "from-beyond": "tom"
  },
  timelineEvents: [
    {
      id: "allie-teilz-reposts-allegation",
      layoutDate: "2025-05-15",
      displayDate: "May 2025",
      title: "Allie Teilz republishes an allegation",
      summary: "DJ and producer Allie Teilz reposted a statement she first made in 2012 and alleged that Jared Leto assaulted her when she was 17. Subsequent reporting said the post prompted numerous responses from women describing similar experiences.",
      response: "Leto's representative called Teilz's allegation demonstrably false and denied all allegations covered by the later report.",
      sources: [
        { label: "Air Mail report", url: "https://airmail.news/issues/2025-6-7/the-cult-of-leto?pubDate=20250607" }
      ]
    },
    {
      id: "air-mail-leto-report",
      layoutDate: "2025-06-07",
      displayDate: "7 June 2025",
      title: "Air Mail publishes nine accounts",
      summary: "Air Mail published accounts from nine women alleging sexual impropriety by Jared Leto, including accounts concerning interactions while some were underage.",
      response: "A representative for Leto expressly denied every allegation in the report.",
      sources: [
        { label: "Air Mail report", url: "https://airmail.news/issues/2025-6-7/the-cult-of-leto?pubDate=20250607" }
      ]
    },
    {
      id: "bbc-leto-documentary",
      layoutDate: "2026-07-29",
      displayDate: "29 July 2026",
      title: "BBC documentary publishes further accounts",
      summary: "A BBC documentary presented four women's allegations concerning sexual misconduct and assault when they were teenagers. The BBC said it corroborated the accounts using supporting photos, messages and a non-disclosure agreement; the Associated Press said it could not independently verify the claims.",
      response: "Leto said he had never sexually assaulted anyone and called the claims absolutely and categorically false.",
      sources: [
        { label: "BBC report", url: "https://www.bbc.com/news/articles/cd7lg2nz2x2o" },
        { label: "Associated Press", url: "https://apnews.com/article/jared-leto-bbc-documentary-assault-allegations-5af6a24a21e4b6a718062a5765b70736" }
      ]
    }
  ],
  movies: [
    {
      id: "unfrosted", title: "Unfrosted", alternateTitles: [], type: "film", releaseYear: 2024,
      watchedDate: "2024-05-07", dateConfidence: "confirmed", category: "normal", chunkCount: null,
      runtime: 93, genres: ["Comedy"], poster: "assets/posters/unfrosted.jpg",
      directors: ["Jerry Seinfeld"], producers: ["Jerry Seinfeld", "Spike Feresten", "Beau Bauman"],
      writers: ["Jerry Seinfeld", "Spike Feresten", "Barry Marder", "Andy Robin"],
      cast: ["Jerry Seinfeld", "Melissa McCarthy", "Jim Gaffigan", "Max Greenfield", "Hugh Grant"],
      connectionCredits: [credit("Nelson Franklin", "Cast"), credit("Peter Dinklage", "Cast")],
      synopsis: "In 1963 Battle Creek, rival cereal companies race to invent a breakfast pastry that will change America.",
      trivia: ["Jerry Seinfeld made his feature directing debut with the film.", "The story grew from Seinfeld's stand-up routine about Pop-Tarts.", "Many comedians appear in small roles as real or invented figures from cereal history."],
      sources: sourceSet("https://www.themoviedb.org/movie/844185-unfrosted", "https://www.imdb.com/title/tt14914430/", "https://en.wikipedia.org/wiki/Unfrosted")
    },
    {
      id: "madame-web", title: "Madame Web", alternateTitles: [], type: "film", releaseYear: 2024,
      watchedDate: "2024-05-29", dateConfidence: "confirmed", category: "normal", chunkCount: null,
      runtime: 116, genres: ["Superhero", "Thriller"], poster: "assets/posters/madame-web.jpg",
      directors: ["S.J. Clarkson"], producers: ["Lorenzo di Bonaventura"],
      writers: ["Matt Sazama", "Burk Sharpless", "Claire Parker", "S.J. Clarkson"],
      cast: ["Dakota Johnson", "Sydney Sweeney", "Isabela Merced", "Celeste O'Connor", "Tahar Rahim"],
      synopsis: "A New York paramedic develops clairvoyant abilities and tries to protect three young women from a killer who has seen their futures.",
      trivia: ["It was S. J. Clarkson's feature-film directing debut.", "The film belongs to Sony's Spider-Man Universe despite Spider-Man not appearing.", "Principal photography took place in Massachusetts, New York City, and Mexico."],
      connections: [hub("sony-marvel", "Sony's Spider-Man Universe", "source")],
      sources: sourceSet("https://www.themoviedb.org/movie/634492-madame-web", "https://www.imdb.com/title/tt11057302/", "https://en.wikipedia.org/wiki/Madame_Web_(film)")
    },
    {
      id: "pinocchio", title: "Pinocchio", alternateTitles: ["Roberto Benigni's Pinocchio", "The Miramax English dub"], type: "film", releaseYear: 2002,
      watchedDate: "2024-06-24", dateConfidence: "confirmed", category: "normal", chunkCount: null,
      runtime: 108, genres: ["Fantasy", "Comedy"], poster: "assets/posters/pinocchio.jpg",
      directors: ["Roberto Benigni"], producers: ["Elda Ferri", "Gianluigi Braschi", "Nicoletta Braschi"],
      writers: ["Roberto Benigni", "Vincenzo Cerami", "Carlo Collodi"],
      cast: ["Roberto Benigni", "Nicoletta Braschi", "Carlo Giuffrè", "Kim Rossi Stuart", "Peppe Barra"],
      synopsis: "A wooden puppet brought to life tumbles through temptations and dangers while trying to become a real boy.",
      trivia: ["Benigni directed the film and, at age 49, played Pinocchio himself.", "Miramax recut and dubbed the film for its English-language release.", "The English dub used celebrity voices including Breckin Meyer, Glenn Close, John Cleese, and Eric Idle."],
      sources: sourceSet("https://www.themoviedb.org/movie/10599-pinocchio", "https://www.imdb.com/title/tt0255477/", "https://en.wikipedia.org/wiki/Pinocchio_(2002_film)")
    },
    {
      id: "golden-arm", title: "The Golden Arm", alternateTitles: ["50 States of Fright: Michigan"], type: "episode", releaseYear: 2020,
      watchedDate: "2024-07-16", dateConfidence: "confirmed", category: "normal", chunkCount: null,
      runtime: 24, genres: ["Horror", "Anthology"], poster: "assets/posters/golden-arm.jpg",
      directors: ["Sam Raimi"], producers: ["David Magee", "Shawn Williamson", "Cody Zwieg"],
      writers: ["Sam Raimi", "Ivan Raimi"],
      cast: ["Rachel Brosnahan", "Travis Fimmel", "John Marshall Jones"],
      episodeCredits: [
        episodeCredit("Sam Raimi", "Director", "nm0000600"), episodeCredit("Sam Raimi", "Writer", "nm0000600"), episodeCredit("Ivan Raimi", "Writer", "nm0706898"),
        episodeCredit("David Magee", "Producer", "nm0535835"), episodeCredit("Shawn Williamson", "Producer", "nm0932144"), episodeCredit("Cody Zwieg", "Executive Producer", "nm0959054"),
        episodeCredit("B.F. Painter", "Associate Producer", "nm0656869"), episodeCredit("Jonathan Shore", "Associate Producer", "nm0794935"),
        episodeCredit("Rachel Brosnahan", "Cast — Heather", "nm3014031"), episodeCredit("Travis Fimmel", "Cast — Dave", "nm1379938"), episodeCredit("John Marshall Jones", "Cast — Andy", "nm0428426"),
        episodeCredit("Christopher Young", "Original Music Composer", "nm0002366")
      ],
      synopsis: "A newlywed's replacement golden arm becomes the center of a gruesome Michigan folk tale.",
      trivia: ["The story launched Quibi's state-by-state horror anthology 50 States of Fright.", "Sam Raimi directed the three short chapters and co-wrote them with his brother Ivan.", "Quibi split each state story into mobile-length chapters; the archive treats the complete Michigan story as one title."],
      connections: [hub("fifty-states", "50 States of Fright", "source"), hub("sam-raimi", "Sam Raimi", "person")],
      sources: sourceSet("https://www.imdb.com/title/tt12174726/", "https://www.imdb.com/title/tt9104072/", "https://en.wikipedia.org/wiki/50_States_of_Fright")
    },
    {
      id: "hundreds-of-beavers", title: "Hundreds of Beavers", alternateTitles: [], type: "film", releaseYear: 2022,
      watchedDate: "2024-07-22", dateConfidence: "confirmed", category: "normal", chunkCount: null,
      runtime: 108, genres: ["Comedy", "Adventure"], poster: "assets/posters/hundreds-of-beavers.jpg",
      directors: ["Mike Cheslik"], producers: ["Kurt Ravenwood"], writers: ["Mike Cheslik", "Ryland Brickson Cole Tews"],
      cast: ["Ryland Brickson Cole Tews", "Olivia Graves", "Wes Tank", "Doug Mancheski", "Luis Rico"],
      synopsis: "A ruined applejack maker becomes a trapper and battles an escalating army of mascot-suited beavers.",
      trivia: ["The mostly dialogue-free comedy was made for roughly $150,000 in Wisconsin and Michigan.", "Its handmade effects combine live action, animation, miniatures, and performers in animal suits.", "A long grassroots theatrical roadshow helped turn the independent film into a cult success."],
      sources: sourceSet("https://www.themoviedb.org/movie/1019939-hundreds-of-beavers", "https://www.imdb.com/title/tt12818328/", "https://en.wikipedia.org/wiki/Hundreds_of_Beavers")
    },
    {
      id: "ball-of-twine", title: "America's Largest Ball of Twine", alternateTitles: ["50 States of Fright: Kansas", "Ball of Twine"], type: "episode", releaseYear: 2020,
      watchedDate: "2024-08-16", dateConfidence: "confirmed", category: "normal", chunkCount: null,
      runtime: 15, genres: ["Horror", "Anthology"], poster: "assets/posters/ball-of-twine.jpg",
      directors: ["Yoko Okumura"], producers: ["David Magee", "Shawn Williamson", "Cody Zwieg"], writers: ["Mae Catt", "Yoko Okumura"],
      cast: ["Ming-Na Wen", "Karen Allen", "Thailey Roberge"],
      episodeCredits: [
        episodeCredit("Yoko Okumura", "Director", "nm3483931"), episodeCredit("Yoko Okumura", "Story", "nm3483931"), episodeCredit("Mae Catt", "Story", "nm3329994"), episodeCredit("Mae Catt", "Teleplay", "nm3329994"),
        episodeCredit("David Magee", "Producer", "nm0535835"), episodeCredit("Shawn Williamson", "Producer", "nm0932144"), episodeCredit("Cody Zwieg", "Executive Producer", "nm0959054"),
        episodeCredit("B.F. Painter", "Associate Producer", "nm0656869"), episodeCredit("Jonathan Shore", "Associate Producer", "nm0794935"), episodeCredit("Sam Raimi", "Series Executive Producer", "nm0000600"),
        episodeCredit("Ming-Na Wen", "Cast — Susan", "nm0001840"), episodeCredit("Karen Allen", "Cast — Sheriff Stallings", "nm0000261"), episodeCredit("Thailey Roberge", "Cast — Amelia", "nm8219539"), episodeCredit("Troy Anthony Young", "Cast — Townsperson", "nm1012521"),
        episodeCredit("Brian Chan", "Original Music Composer", "nm5453111"), episodeCredit("Caleb Chan", "Original Music Composer", "nm6737435")
      ],
      synopsis: "A mother and daughter stop at a Kansas roadside attraction whose enormous ball of twine hides a lethal secret.",
      trivia: ["The Kansas story was released as three short Quibi chapters.", "Director Yoko Okumura also co-wrote the screen story with Mae Catt.", "The roadside-monument premise riffs on the real American rivalry over the world's largest twine ball."],
      connections: [hub("fifty-states", "50 States of Fright", "source"), hub("sam-raimi", "Sam Raimi", "person")],
      sources: sourceSet("https://www.imdb.com/title/tt12174570/", "https://www.imdb.com/title/tt9104072/", "https://en.wikipedia.org/wiki/50_States_of_Fright")
    },
    {
      id: "hard-ticket-to-hawaii", title: "Hard Ticket to Hawaii", alternateTitles: [], type: "film", releaseYear: 1987,
      watchedDate: "2024-08-20", dateConfidence: "confirmed", category: "normal", chunkCount: null,
      runtime: 96, genres: ["Action"], poster: "assets/posters/hard-ticket-to-hawaii.jpg",
      directors: ["Andy Sidaris"], producers: ["Arlene Sidaris"], writers: ["Andy Sidaris"],
      cast: ["Ronn Moss", "Dona Speir", "Hope Marie Carlton", "Harold Diamond", "Rodrigo Obregón"],
      synopsis: "DEA agents in Hawaii collide with diamond smugglers, assassins, and a toxin-infected snake.",
      trivia: ["The film is part of Andy Sidaris's loosely connected Triple B series.", "Former Playboy Playmates Dona Speir and Hope Marie Carlton play the lead agents.", "Its exploding skateboarder and giant snake have become widely circulated cult-film moments."],
      sources: sourceSet("https://www.themoviedb.org/movie/26011-hard-ticket-to-hawaii", "https://www.imdb.com/title/tt0093146/", "https://en.wikipedia.org/wiki/Hard_Ticket_to_Hawaii")
    },
    {
      id: "bedtime-stories", title: "Tim and Eric's Bedtime Stories", alternateTitles: ["Tim & Eric's Bedtime Stories", "Bedtime Stories"], type: "TV series", releaseYear: 2014,
      watchedDate: "2024-09-12", dateConfidence: "confirmed", category: "normal", chunkCount: null,
      runtime: 11, genres: ["Comedy horror", "Surreal comedy", "Anthology"], poster: "assets/posters/bedtime-stories.jpg",
      directors: ["Tim Heidecker", "Eric Wareheim"], producers: ["Tim Heidecker", "Eric Wareheim", "Dave Kneebone"], writers: ["Tim Heidecker", "Eric Wareheim", "Jason Woliner"],
      cast: ["Tim Heidecker", "Eric Wareheim", "Zach Galifianakis", "John C. Reilly", "Bob Odenkirk"],
      synopsis: "Tim Heidecker and Eric Wareheim present a darkly comic anthology of suburban nightmares, grotesque fixations, and surreal horror stories.",
      trivia: ["The Haunted House pilot aired on Halloween 2013 before the series premiered in September 2014.", "Adult Swim describes the show as Tim and Eric bringing their demented comedy into dreamland.", "The anthology ran for 15 installments, with most episodes lasting about 11 minutes."],
      sources: sourceSet("https://www.themoviedb.org/tv/72874-tim-and-eric-s-bedtime-stories", "https://www.imdb.com/title/tt3292726/", "https://www.adultswim.com/videos/tim-erics-bedtime-stories/")
    },
    {
      id: "trancers-5", title: "Trancers 5: Sudden Deth", alternateTitles: [], type: "film", releaseYear: 1994,
      watchedDate: "2024-10-11", dateConfidence: "confirmed", category: "normal", chunkCount: null,
      runtime: 73, genres: ["Science fiction", "Action"], poster: "assets/posters/trancers-5.jpeg",
      directors: ["David Nutter"], producers: ["Oana Păunescu", "Vlad Păunescu"], writers: ["Peter David"],
      cast: ["Tim Thomerson", "Stacie Randall", "Ty Miller", "Terri Ivens", "Mark Arnold"],
      connectionCredits: [credit("Charles Band", "Executive Producer")],
      synopsis: "Time-traveling cop Jack Deth fights to escape the fantasy world of Orpheus and return home.",
      trivia: ["It was filmed back-to-back in Romania with Trancers 4.", "Comic-book writer Peter David wrote both Romanian-shot sequels.", "The title preserves the franchise's recurring joke around hero Jack Deth's surname."],
      sources: sourceSet("https://www.themoviedb.org/movie/47663-trancers-5-sudden-deth", "https://www.imdb.com/title/tt0114717/", "https://en.wikipedia.org/wiki/Trancers_5:_Sudden_Deth")
    },
    {
      id: "chopping-mall", title: "Chopping Mall", alternateTitles: ["Killbots"], type: "film", releaseYear: 1986,
      watchedDate: "2024-10-28", dateConfidence: "confirmed", category: "normal", chunkCount: null,
      runtime: 77, genres: ["Horror", "Science fiction"], poster: "assets/posters/chopping-mall.jpg",
      directors: ["Jim Wynorski"], producers: ["Julie Corman"], writers: ["Jim Wynorski", "Steve Mitchell"],
      cast: ["Kelli Maroney", "Tony O'Dell", "John Terlesky", "Russell Todd", "Karrie Emerson"],
      connectionCredits: [credit("Barbara Crampton", "Cast"), credit("Dick Miller", "Cast"), credit("Lenny Juliano", "Cast")],
      synopsis: "Teenagers trapped overnight in a shopping mall are hunted by malfunctioning security robots.",
      trivia: ["The film first opened as Killbots before being retitled and re-released as Chopping Mall.", "It was shot at Los Angeles's Sherman Oaks Galleria.", "Producer Roger Corman's regulars Dick Miller, Mary Woronov, and Paul Bartel make appearances."],
      sources: sourceSet("https://www.themoviedb.org/movie/28941-chopping-mall", "https://www.imdb.com/title/tt0090837/", "https://en.wikipedia.org/wiki/Chopping_Mall")
    },
    {
      id: "the-mask", title: "The Mask", alternateTitles: [], type: "film", releaseYear: 1994,
      watchedDate: "2024-11-14", dateConfidence: "confirmed", category: "normal", chunkCount: 19,
      runtime: 101, genres: ["Comedy", "Fantasy"], poster: "assets/posters/the-mask.jpg",
      directors: ["Chuck Russell"], producers: ["Robert Engelman"], writers: ["Mike Werb"],
      cast: ["Jim Carrey", "Peter Riegert", "Peter Greene", "Amy Yasbeck", "Cameron Diaz"],
      connectionCredits: [credit("Blake Clark", "Cast")],
      synopsis: "A timid bank clerk becomes a reality-bending green trickster whenever he wears a mysterious mask.",
      trivia: ["The film loosely adapts Dark Horse's much more violent Mask comics.", "Producer Robert Engelman is credited as Bob Engelman.", "It marked Cameron Diaz's film debut."],
      sources: sourceSet("https://www.themoviedb.org/movie/854-the-mask", "https://www.imdb.com/title/tt0110475/", "https://en.wikipedia.org/wiki/The_Mask_(1994_film)")
    },
    {
      id: "shakma", title: "Shakma", alternateTitles: [], type: "film", releaseYear: 1990,
      watchedDate: "2024-12-11", dateConfidence: "confirmed", category: "normal", chunkCount: 20,
      runtime: 101, genres: ["Horror"], poster: "assets/posters/shakma.jpg",
      directors: ["Hugh Parks", "Tom Logan"], producers: ["Hugh Parks"], writers: ["Roger Engle"],
      cast: ["Christopher Atkins", "Amanda Wyss", "Ari Meyers", "Roddy McDowall", "Robb Edward Morris"],
      synopsis: "Medical students playing a live-action role-playing game are locked in a building with an enraged baboon.",
      trivia: ["The title animal was played by a real baboon named Typhoon.", "The characters' fantasy game predates the later popularity of the term live-action role-playing in film plots.", "The film was released in some territories under alternate titles including Panic in the Tower."],
      sources: sourceSet("https://www.themoviedb.org/movie/36992-shakma", "https://www.imdb.com/title/tt0100589/", "https://en.wikipedia.org/wiki/Shakma")
    },
    {
      id: "better-off-dead", title: "Better Off Dead", alternateTitles: [], type: "film", releaseYear: 1985,
      watchedDate: "2025-01-04", dateConfidence: "confirmed", category: "normal", chunkCount: 19,
      runtime: 97, genres: ["Comedy", "Romance"], poster: "assets/posters/better-off-dead.jpg",
      directors: ["Savage Steve Holland"], producers: ["Michael Jaffe"], writers: ["Savage Steve Holland"],
      cast: ["John Cusack", "Diane Franklin", "Curtis Armstrong", "Amanda Wyss", "David Ogden Stiers"],
      connectionCredits: [credit("Laura Waterbury", "Cast"), credit("Vincent Schiavelli", "Cast")],
      synopsis: "After being dumped, a teenager survives surreal family life, ski-race rivalry, and a relentless paperboy.",
      trivia: ["Savage Steve Holland based parts of the story on his own teenage breakup.", "The film mixes live action with stop-motion and hand-drawn animated interludes.", "The paperboy's demand for two dollars became the film's best-known recurring line."],
      sources: sourceSet("https://www.themoviedb.org/movie/13667-better-off-dead", "https://www.imdb.com/title/tt0088794/", "https://en.wikipedia.org/wiki/Better_Off_Dead_(film)")
    },
    {
      id: "electric-dreams", title: "Electric Dreams", alternateTitles: [], type: "film", releaseYear: 1984,
      watchedDate: "2025-01-31", dateConfidence: "confirmed", category: "normal", chunkCount: 19,
      runtime: 95, genres: ["Science fiction", "Romance"], poster: "assets/posters/electric-dreams.jpg",
      directors: ["Steve Barron"], producers: ["Larry DeWaay", "Rusty Lemorande"], writers: ["Rusty Lemorande"],
      cast: ["Lenny von Dohlen", "Virginia Madsen", "Maxwell Caulfield", "Bud Cort", "Don Fellows"],
      synopsis: "A home computer becomes sentient, composes music, and falls for the cellist living upstairs from its owner.",
      trivia: ["Music-video director Steve Barron made his feature debut with the film.", "Giorgio Moroder produced a soundtrack featuring Culture Club, Jeff Lynne, and Philip Oakey.", "Bud Cort provides the uncredited voice of the computer Edgar."],
      sources: sourceSet("https://www.themoviedb.org/movie/19596-electric-dreams", "https://www.imdb.com/title/tt0087197/", "https://en.wikipedia.org/wiki/Electric_Dreams_(film)")
    },
    {
      id: "com-for-murder", title: ".com for Murder", alternateTitles: [], type: "film", releaseYear: 2002,
      watchedDate: "2025-05-21", dateConfidence: "confirmed", category: "normal", chunkCount: 19,
      runtime: 96, genres: ["Thriller"], poster: "assets/posters/com-for-murder.jpg",
      directors: ["Nico Mastorakis"], producers: ["Nico Mastorakis"], writers: ["Nico Mastorakis", "Phil Marr"],
      cast: ["Nastassja Kinski", "Nicollette Sheridan", "Roger Daltrey", "Huey Lewis", "Jeffery Dean"],
      synopsis: "A woman recovering at home encounters a serial killer through an online chat room and turns her connected house into a battleground.",
      trivia: ["Director Nico Mastorakis built the thriller around early-web anxieties and a highly automated home.", "Rock musicians Roger Daltrey and Huey Lewis both appear in supporting roles.", "The film premiered at the 2001 Thessaloniki International Film Festival before its home-video release."],
      sources: sourceSet("https://www.themoviedb.org/movie/34959-com-for-murder", "https://www.imdb.com/title/tt0278259/", "https://en.wikipedia.org/wiki/.com_for_Murder")
    },
    {
      id: "the-stunt-man", title: "The Stunt Man", alternateTitles: [], type: "film", releaseYear: 1980,
      watchedDate: "2025-02-26", dateConfidence: "confirmed", category: "normal", chunkCount: 26,
      runtime: 131, genres: ["Comedy", "Thriller"], poster: "assets/posters/the-stunt-man.jpg",
      directors: ["Richard Rush"], producers: ["Richard Rush", "Melvin Simon"], writers: ["Lawrence B. Marcus", "Richard Rush", "Paul Brodeur"],
      cast: ["Peter O'Toole", "Steve Railsback", "Barbara Hershey", "Allen Garfield", "Alex Rocco"],
      synopsis: "A fugitive hides on a war-film set, where a manipulative director hires him to replace a dead stunt performer.",
      trivia: ["The completed film struggled for distribution before strong festival screenings built momentum.", "It received three Academy Award nominations: director, adapted screenplay, and actor for Peter O'Toole.", "The production-within-the-film was shot at San Diego's Hotel del Coronado."],
      connections: [hub("steve-railsback", "Steve Railsback", "person")],
      sources: sourceSet("https://www.themoviedb.org/movie/42160-the-stunt-man", "https://www.imdb.com/title/tt0081568/", "https://en.wikipedia.org/wiki/The_Stunt_Man")
    },
    {
      id: "lifeforce", title: "Lifeforce", alternateTitles: ["The Space Vampires"], type: "film", releaseYear: 1985,
      watchedDate: "2025-03-29", dateConfidence: "confirmed", category: "normal", chunkCount: 23,
      runtime: 116, genres: ["Science fiction", "Horror"], poster: "assets/posters/lifeforce.jpg",
      directors: ["Tobe Hooper"], producers: ["Menahem Golan", "Yoram Globus"], writers: ["Dan O'Bannon", "Don Jakoby", "Colin Wilson"],
      cast: ["Steve Railsback", "Peter Firth", "Frank Finlay", "Mathilda May", "Patrick Stewart"],
      synopsis: "An alien vessel found inside Halley's Comet brings energy-draining humanoids and catastrophe to London.",
      trivia: ["The film adapts Colin Wilson's novel The Space Vampires.", "It was one of Tobe Hooper's three films made under a contract with Cannon Films.", "Henry Mancini composed the orchestral score, with additional electronic music by Michael Kamen."],
      connections: [hub("steve-railsback", "Steve Railsback", "person")],
      sources: sourceSet("https://www.themoviedb.org/movie/11954-lifeforce", "https://www.imdb.com/title/tt0089489/", "https://en.wikipedia.org/wiki/Lifeforce_(film)")
    },
    {
      id: "lethal-weapon", title: "Lethal Weapon", alternateTitles: [], type: "film", releaseYear: 1987,
      watchedDate: "2025-04-26", dateConfidence: "confirmed", category: "normal", chunkCount: 21,
      runtime: 110, genres: ["Action", "Crime"], poster: "assets/posters/lethal-weapon.jpg",
      directors: ["Richard Donner"], producers: ["Richard Donner", "Joel Silver"], writers: ["Shane Black"],
      cast: ["Mel Gibson", "Danny Glover", "Gary Busey", "Mitchell Ryan", "Tom Atkins"],
      connectionCredits: [credit("Damon Hines", "Cast"), credit("Jack Thibeau", "Cast"), credit("Lenny Juliano", "Cast"), credit("Selma Archerd", "Cast")],
      synopsis: "A cautious veteran detective is partnered with a volatile former special-forces officer to uncover a drug-smuggling operation.",
      trivia: ["The screenplay launched Shane Black's career while he was still in his early twenties.", "The film established the Riggs-and-Murtaugh partnership that continued through three sequels.", "Eric Clapton and Michael Kamen composed the score, with David Sanborn supplying Murtaugh's saxophone theme."],
      sources: sourceSet("https://www.themoviedb.org/movie/941-lethal-weapon", "https://www.imdb.com/title/tt0093409/", "https://en.wikipedia.org/wiki/Lethal_Weapon")
    },
    {
      id: "uninvited", title: "Uninvited", alternateTitles: ["Killer Cat"], type: "film", releaseYear: 1988,
      watchedDate: "2025-06-11", dateConfidence: "estimated", category: "normal", chunkCount: 17,
      runtime: 90, genres: ["Horror", "Science fiction"], poster: "assets/posters/uninvited.jpg",
      directors: ["Greydon Clark"], producers: ["Greydon Clark"], writers: ["Greydon Clark"],
      cast: ["George Kennedy", "Alex Cord", "Clu Gulager", "Toni Hudson", "Eric Larson"],
      synopsis: "A genetically altered cat escapes a laboratory and boards a yacht carrying criminals and unsuspecting guests.",
      trivia: ["The film has circulated under alternate titles including Killer Cat and Mutant Cat.", "Its central creature is a smaller monster that emerges from the mouth of an apparently ordinary cat.", "Writer-director Greydon Clark also made the cult films Without Warning and Joysticks."],
      sources: sourceSet("https://www.themoviedb.org/movie/45937-uninvited", "https://www.imdb.com/title/tt0096341/", "https://en.wikipedia.org/wiki/Uninvited_(1988_film)")
    },
    {
      id: "dragonball-evolution", title: "Dragonball Evolution", alternateTitles: [], type: "film", releaseYear: 2009,
      watchedDate: "2025-07-01", dateConfidence: "estimated", category: "normal", chunkCount: 15,
      runtime: 85, genres: ["Action", "Fantasy"], poster: "assets/posters/dragonball-evolution.webp",
      directors: ["James Wong"], producers: ["Stephen Chow"], writers: ["Ben Ramsey", "Akira Toriyama"],
      cast: ["Justin Chatwin", "Chow Yun-fat", "Emmy Rossum", "Jamie Chung", "James Marsters"],
      synopsis: "A teenage martial artist searches for seven mystical Dragon Balls before the returning Lord Piccolo can use them.",
      trivia: ["The film is a live-action adaptation of Akira Toriyama's Dragon Ball manga.", "Screenwriter Ben Ramsey later publicly apologized to fans for the adaptation.", "Toriyama has said the production did not follow the ideas and warnings he offered."],
      sources: sourceSet("https://www.themoviedb.org/movie/14164-dragonball-evolution", "https://www.imdb.com/title/tt1098327/", "https://en.wikipedia.org/wiki/Dragonball_Evolution")
    },
    {
      id: "the-fury", title: "The Fury", alternateTitles: [], type: "film", releaseYear: 1978,
      watchedDate: "2025-07-21", dateConfidence: "estimated", category: "normal", chunkCount: 23,
      runtime: 118, genres: ["Horror", "Thriller"], poster: "assets/posters/the-fury.jpg",
      directors: ["Brian De Palma"], producers: ["Frank Yablans"], writers: ["John Farris"],
      cast: ["Kirk Douglas", "John Cassavetes", "Carrie Snodgress", "Charles Durning", "Amy Irving"],
      connectionCredits: [credit("Fiona Lewis", "Cast")],
      synopsis: "A former intelligence agent and a psychic teenager search for his kidnapped telekinetic son.",
      trivia: ["John Farris adapted the screenplay from his own novel.", "Composer John Williams recorded the score immediately before beginning Superman.", "The elaborate final effect was filmed with multiple cameras because the set could only be destroyed once."],
      sources: sourceSet("https://www.themoviedb.org/movie/12611-the-fury", "https://www.imdb.com/title/tt0077588/", "https://en.wikipedia.org/wiki/The_Fury_(film)")
    },
    {
      id: "champagne-and-bullets", title: "Champagne and Bullets", alternateTitles: ["Road to Revenge", "GetEven"], type: "film", releaseYear: 1993,
      watchedDate: "2025-08-18", dateConfidence: "estimated", category: "normal", chunkCount: 19,
      runtime: 99, genres: ["Action", "Drama"], poster: "assets/posters/champagne-and-bullets.jpg",
      directors: ["John De Hart", "James Paradise"], producers: ["John De Hart", "Rebecca Warren", "Jimmy Williams"], writers: ["John De Hart"],
      cast: ["John De Hart", "Wings Hauser", "William Smith", "Pamela Jean Bryant", "Elaine Young"],
      synopsis: "A former cop battles a corrupt judge, a satanic conspiracy, and assorted enemies while pursuing romance and revenge.",
      trivia: ["Writer-director-producer John De Hart also stars and performs original songs.", "The film exists in several substantially different cuts titled GetEven, Road to Revenge, and Champagne and Bullets.", "Its rediscovery through cult screenings and home-video releases turned it into a bad-movie favorite."],
      sources: sourceSet("https://www.themoviedb.org/movie/99373-geteven", "https://www.imdb.com/title/tt0169183/", "https://en.wikipedia.org/wiki/Champagne_and_Bullets")
    },
    {
      id: "tammy-and-the-t-rex", title: "Tammy and the T-Rex", alternateTitles: ["Tanny and the Teenage T-Rex"], type: "film", releaseYear: 1994,
      watchedDate: "2025-09-17", dateConfidence: "estimated", category: "normal", chunkCount: 17,
      runtime: 82, genres: ["Comedy", "Science fiction"], poster: "assets/posters/tammy-and-the-t-rex.jpg",
      directors: ["Stewart Raffill"], producers: ["Diane Kirman"], writers: ["Stewart Raffill", "Gary Brockette"],
      cast: ["Denise Richards", "Paul Walker", "Terry Kiser", "Theo Forsett", "Ellen Dubin"],
      synopsis: "A mad scientist implants a murdered teenager's brain into a robotic Tyrannosaurus rex.",
      trivia: ["The production was built around access to a full-size animatronic T. rex that had to be returned quickly.", "Producer Diane Kirman is credited as Diane Raffill.", "The 82-minute cut matches the archive's 17 chunks; a longer gore cut was restored in 2019."],
      sources: sourceSet("https://www.themoviedb.org/movie/55563-tammy-and-the-t-rex", "https://www.imdb.com/title/tt0111361/", "https://en.wikipedia.org/wiki/Tammy_and_the_T-Rex")
    },
    {
      id: "innerspace", title: "Innerspace", alternateTitles: [], type: "film", releaseYear: 1987,
      watchedDate: "2025-09-29", dateConfidence: "confirmed", category: "normal", chunkCount: 23,
      runtime: 120, genres: ["Comedy", "Science fiction"], poster: "assets/posters/innerspace.jpg",
      directors: ["Joe Dante"], producers: ["Michael Finnell"], writers: ["Jeffrey Boam", "Chip Proser"],
      cast: ["Dennis Quaid", "Martin Short", "Meg Ryan", "Kevin McCarthy", "Robert Picardo"],
      connectionCredits: [credit("Dick Miller", "Cast"), credit("Fiona Lewis", "Cast"), credit("Laura Waterbury", "Cast"), credit("Robert Gray", "Cast")],
      synopsis: "A miniaturized test pilot is accidentally injected into a neurotic grocery clerk while thieves pursue the technology.",
      trivia: ["The film won the Academy Award for Best Visual Effects.", "Its premise was inspired by Fantastic Voyage but played largely as a comedy.", "Dennis Quaid and Meg Ryan met during production and later married."],
      connections: [hub("martin-short", "Martin Short", "person")],
      sources: sourceSet("https://www.themoviedb.org/movie/2614-innerspace", "https://www.imdb.com/title/tt0093260/", "https://en.wikipedia.org/wiki/Innerspace")
    },
    {
      id: "maximum-overdrive", title: "Maximum Overdrive", alternateTitles: [], type: "film", releaseYear: 1986,
      watchedDate: "2025-10-30", dateConfidence: "confirmed", category: "normal", chunkCount: 19,
      runtime: 98, genres: ["Horror", "Science fiction"], poster: "assets/posters/maximum-overdrive.jpg",
      directors: ["Stephen King"], producers: ["Martha De Laurentiis", "Dino De Laurentiis"], writers: ["Stephen King"],
      cast: ["Emilio Estevez", "Pat Hingle", "Laura Harrington", "Yeardley Smith", "John Short"],
      synopsis: "A comet causes machines to turn homicidal, trapping survivors at a North Carolina truck stop.",
      trivia: ["It remains the only feature film directed by Stephen King.", "Producer Martha De Laurentiis is credited as Martha Schumacher.", "AC/DC supplied the soundtrack album Who Made Who."],
      connections: [hub("stephen-king", "Stephen King", "source"), hub("dino", "Dino De Laurentiis", "production")],
      sources: sourceSet("https://www.themoviedb.org/movie/9980-maximum-overdrive", "https://www.imdb.com/title/tt0091499/", "https://en.wikipedia.org/wiki/Maximum_Overdrive")
    },
    {
      id: "toxic-avenger", title: "The Toxic Avenger", alternateTitles: ["The 2023 remake", "The Toxic Avenger Unrated"], type: "film", releaseYear: 2023,
      watchedDate: "2025-11-26", dateConfidence: "confirmed", category: "normal", chunkCount: null,
      runtime: 102, genres: ["Action", "Comedy", "Horror"], poster: "assets/posters/toxic-avenger.jpg",
      directors: ["Macon Blair"], producers: ["Lloyd Kaufman", "Michael Herz", "Mary Parent", "Alex Garcia"], writers: ["Macon Blair"],
      cast: ["Peter Dinklage", "Jacob Tremblay", "Taylour Paige", "Elijah Wood", "Kevin Bacon"],
      synopsis: "A downtrodden janitor becomes a radioactive mutant vigilante after a toxic accident.",
      trivia: ["The film reimagines Troma's 1984 cult superhero comedy.", "Peter Dinklage plays Winston Gooze while Luisa Guerreiro performs the Toxic Avenger's physical role.", "It premiered at Fantastic Fest in 2023 and reached wide release after a prolonged distribution search."],
      sources: sourceSet("https://www.themoviedb.org/movie/338969-the-toxic-avenger", "https://www.imdb.com/title/tt1633359/", "https://en.wikipedia.org/wiki/The_Toxic_Avenger_(2023_film)")
    },
    {
      id: "the-fanatic", title: "The Fanatic", alternateTitles: ["Moose"], type: "film", releaseYear: 2019,
      watchedDate: "2025-12-19", dateConfidence: "confirmed", category: "normal", chunkCount: null,
      runtime: 88, genres: ["Thriller"], poster: "assets/posters/the-fanatic.jpg",
      directors: ["Fred Durst"], producers: ["Daniel Grodnik", "Oscar Generale", "Bill Kenwright"], writers: ["Fred Durst", "Dave Bekerman"],
      cast: ["John Travolta", "Devon Sawa", "Ana Golja", "James Paxton", "Jessica Uberuaga"],
      synopsis: "An obsessive film fan begins stalking his favorite action star after an autograph encounter goes badly.",
      trivia: ["Limp Bizkit frontman Fred Durst directed and co-wrote the film.", "The story was reportedly inspired by a real fan who pursued Durst.", "The project was filmed under the working title Moose, the name of Travolta's character."],
      sources: sourceSet("https://www.themoviedb.org/movie/509853-the-fanatic", "https://www.imdb.com/title/tt7869070/", "https://en.wikipedia.org/wiki/The_Fanatic_(2019_film)")
    },
    {
      id: "emmas-boy", title: "Emma's Boy", alternateTitles: ["Dark Realm, episode 11"], type: "episode", releaseYear: 2001,
      watchedDate: "2026-01-08", dateConfidence: "confirmed", category: "reward", chunkCount: 9,
      runtime: 44, genres: ["Horror", "Anthology"], poster: "assets/posters/emmas-boy.jpg",
      directors: ["Eric Summer"], producers: ["Steve Christian", "Dimitri Logothetis", "Jim McGrath", "Heather Ogilvie"], writers: [],
      cast: ["Christopher Atkins", "Nigel Bennett", "Antony Carrick", "Kim Darby", "Emily Lloyd"],
      episodeCredits: [
        episodeCredit("Eric Summer", "Director", "nm0838599"), episodeCredit("Steve Christian", "Executive Producer", "nm0160091"), episodeCredit("Dimitri Logothetis", "Executive Producer", "nm0517768"),
        episodeCredit("Jim McGrath", "Executive Producer", "nm0569808"), episodeCredit("Heather Ogilvie", "Executive Producer", "nm0644696"),
        episodeCredit("Christopher Atkins", "Cast — Jack Anderson", "nm0000803"), episodeCredit("Nigel Bennett", "Cast — Patrick Lawless", "nm0000911"), episodeCredit("Antony Carrick", "Cast — Doctor Elliott", "nm0140354"),
        episodeCredit("Kim Darby", "Cast — Tilly Lawless", "nm0200981"), episodeCredit("Emily Lloyd", "Cast — Emma", "nm0000503"), episodeCredit("Alistair Maydon", "Cast — Caretaker", "nm1859723"),
        episodeCredit("Margot Steinberg", "Cast — Antique-store woman", "nm0825784"), episodeCredit("Edward Woodward", "Cast — Captain Kelly", "nm0940919")
      ],
      synopsis: "A pregnant Emma and her husband travel to an island connected to her late mother, where a sinister cult has plans for their unborn child.",
      trivia: ["The episode is season 1, episode 11 of the horror anthology Dark Realm.", "IMDb records its original broadcast on 26 May 2001.", "The episode stars Emily Lloyd as Emma, with Christopher Atkins, Nigel Bennett, Kim Darby, and Edward Woodward."],
      sources: sourceSet("https://www.imdb.com/title/tt0554665/", "https://www.imdb.com/title/tt0237959/", "https://en.wikipedia.org/wiki/Dark_Realm")
    },
    {
      id: "buckaroo-banzai", title: "The Adventures of Buckaroo Banzai Across the 8th Dimension", alternateTitles: ["Buckaroo Banzai"], type: "film", releaseYear: 1984,
      watchedDate: "2026-01-30", dateConfidence: "estimated", category: "normal", chunkCount: null,
      runtime: 103, genres: ["Science fiction", "Comedy"], poster: "assets/posters/buckaroo-banzai.jpg",
      directors: ["W. D. Richter"], producers: ["Neil Canton"], writers: ["Earl Mac Rauch"],
      cast: ["Peter Weller", "John Lithgow", "Ellen Barkin", "Jeff Goldblum", "Christopher Lloyd"],
      connectionCredits: [credit("Damon Hines", "Cast"), credit("Laura Harrington", "Cast"), credit("Robert Gray", "Cast"), credit("Vincent Schiavelli", "Cast")],
      synopsis: "A physicist, rock star, and adventurer leads the Hong Kong Cavaliers against aliens from the eighth dimension.",
      trivia: ["The end credits promise a sequel titled Buckaroo Banzai Against the World Crime League that was never produced as a film.", "Screenwriter Earl Mac Rauch later wrote a Buckaroo Banzai novel expanding the story.", "Its dense in-universe history deliberately treats the audience as if the characters were already famous."],
      sources: sourceSet("https://www.themoviedb.org/movie/11379-the-adventures-of-buckaroo-banzai-across-the-8th-dimension", "https://www.imdb.com/title/tt0086856/", "https://en.wikipedia.org/wiki/The_Adventures_of_Buckaroo_Banzai_Across_the_8th_Dimension")
    },
    {
      id: "police-story", title: "Police Story", alternateTitles: ["Ging chaat goo si"], type: "film", releaseYear: 1985,
      watchedDate: "2026-02-23", dateConfidence: "confirmed", category: "normal", chunkCount: null,
      runtime: 100, genres: ["Action", "Comedy"], poster: "assets/posters/police-story.jpg",
      directors: ["Jackie Chan"], producers: ["Raymond Chow", "Leonard Ho"], writers: ["Jackie Chan", "Edward Tang"],
      cast: ["Jackie Chan", "Brigitte Lin", "Maggie Cheung", "Bill Tung", "Chor Yuen"],
      synopsis: "A Hong Kong police inspector must protect a witness and clear his name after a crime boss frames him for murder.",
      trivia: ["Jackie Chan conceived the film after an unsatisfying attempt to break into the American market.", "The opening shantytown chase and climactic shopping-mall stunt became landmarks of Hong Kong action cinema.", "Chan performed the pole slide through electric lights despite burns and other injuries."],
      sources: sourceSet("https://www.themoviedb.org/movie/9056-police-story", "https://www.imdb.com/title/tt0089374/", "https://en.wikipedia.org/wiki/Police_Story_(1985_film)")
    },
    {
      id: "live-wire", title: "Live Wire", alternateTitles: [], type: "film", releaseYear: 1992,
      watchedDate: "2026-03-18", dateConfidence: "confirmed", category: "normal", chunkCount: null,
      runtime: 85, genres: ["Action", "Thriller"], poster: "assets/posters/live-wire.jpg",
      directors: ["Christian Duguay"], producers: ["Suzanne Todd", "David Willis"], writers: ["Bart Baker"],
      cast: ["Pierce Brosnan", "Ron Silver", "Ben Cross", "Lisa Eilbacher", "Tony Plana"],
      connectionCredits: [credit("Selma Archerd", "Cast")],
      synopsis: "An FBI bomb expert hunts terrorists using an invisible liquid explosive that detonates inside its victims.",
      trivia: ["The film was one of Pierce Brosnan's action leads before he became James Bond.", "Its fictional explosive is disguised as ordinary water and activated after ingestion.", "Christian Duguay later directed the miniseries Joan of Arc and the thriller The Art of War."],
      sources: sourceSet("https://www.themoviedb.org/movie/12629-live-wire", "https://www.imdb.com/title/tt0104743/", "https://en.wikipedia.org/wiki/Live_Wire_(film)")
    },
    {
      id: "good-luck-have-fun-dont-die", title: "Good Luck, Have Fun, Don't Die", alternateTitles: ["GLHFDD"], type: "film", releaseYear: 2025,
      watchedDate: "2026-04-06", dateConfidence: "confirmed", category: "normal", chunkCount: null,
      runtime: 134, genres: ["Science fiction", "Comedy"], poster: "assets/posters/good-luck-have-fun-dont-die.jpg",
      directors: ["Gore Verbinski"], producers: ["Robert Kulzer", "Erwin Stoff", "Oly Obst"], writers: ["Matthew Robinson"],
      cast: ["Sam Rockwell", "Haley Lu Richardson", "Michael Peña", "Zazie Beetz", "Juno Temple"],
      synopsis: "A mysterious man recruits Los Angeles diner patrons for a one-night mission to save the world from an artificial intelligence.",
      trivia: ["The film marked Gore Verbinski's return to feature directing after A Cure for Wellness.", "It premiered at Fantastic Fest in 2025.", "The ensemble story unfolds around strangers gathered in a diner for a purported world-saving mission."],
      connections: [hub("zazie-beetz", "Zazie Beetz", "person")],
      sources: sourceSet("https://www.themoviedb.org/movie/1119449-good-luck-have-fun-don-t-die", "https://www.imdb.com/title/tt1341338/", "https://en.wikipedia.org/wiki/Good_Luck,_Have_Fun,_Don%27t_Die")
    },
    {
      id: "the-dead-zone", title: "The Dead Zone", alternateTitles: [], type: "film", releaseYear: 1983,
      watchedDate: "2026-05-09", dateConfidence: "confirmed", category: "normal", chunkCount: null,
      runtime: 103, genres: ["Thriller", "Science fiction"], poster: "assets/posters/the-dead-zone.jpg",
      directors: ["David Cronenberg"], producers: ["Debra Hill", "Dino De Laurentiis"], writers: ["Jeffrey Boam", "Stephen King"],
      cast: ["Christopher Walken", "Brooke Adams", "Tom Skerritt", "Herbert Lom", "Martin Sheen"],
      synopsis: "A teacher awakens from a coma able to see people's futures and confronts a vision of political catastrophe.",
      trivia: ["The film adapts Stephen King's 1979 novel.", "David Cronenberg was hired after several other directors had been attached to the project.", "Christopher Walken's Johnny Smith touches people physically to trigger visions, giving the supernatural device an intimate screen language."],
      connections: [hub("stephen-king", "Stephen King", "source"), hub("dino", "Dino De Laurentiis", "production")],
      sources: sourceSet("https://www.themoviedb.org/movie/11336-the-dead-zone", "https://www.imdb.com/title/tt0085407/", "https://en.wikipedia.org/wiki/The_Dead_Zone_(film)")
    },
    {
      id: "the-napa-boys", title: "The Napa Boys", alternateTitles: [], type: "film", releaseYear: 2025,
      watchedDate: "2026-06-06", dateConfidence: "confirmed", category: "normal", chunkCount: null,
      runtime: 92, genres: ["Comedy", "Adventure"], poster: "assets/posters/the-napa-boys.jpg",
      directors: ["Nick Corirossi"], producers: ["Mike Rosenstein", "Erin Owens", "Armen Weitzman"], writers: ["Nick Corirossi", "Armen Weitzman"],
      cast: ["Armen Weitzman", "Nick Corirossi", "Sarah Ramos", "Jamar Malachi Neighbors", "Mike Mitchell"],
      connectionCredits: [credit("Nelson Franklin", "Cast")],
      synopsis: "A mysterious figure called the Sommelier leads a group of friends through an increasingly absurd wine-country adventure.",
      trivia: ["The comedy premiered in the Midnight Madness section of the 2025 Toronto International Film Festival.", "Its marketing presents the movie as a later installment in an entirely invented long-running franchise.", "Magnolia Pictures acquired United States distribution after the festival premiere."],
      sources: sourceSet("https://www.themoviedb.org/movie/1517305-the-napa-boys", "https://www.imdb.com/title/tt37532179/", "https://static1.squarespace.com/static/576454e629687fb39bd1f977/t/698cec43f0c36f4c531d8d17/1770843204010/THENAPABOYSfinalnotes.pdf")
    },
    {
      id: "cherry-2000", title: "Cherry 2000", alternateTitles: [], type: "film", releaseYear: 1987,
      watchedDate: "2026-06-27", dateConfidence: "confirmed", category: "normal", chunkCount: null,
      runtime: 99, genres: ["Science fiction", "Adventure"], poster: "assets/posters/cherry-2000.jpg",
      directors: ["Steve De Jarnatt"], producers: ["Edward R. Pressman", "Caldecot Chubb"], writers: ["Michael Almereyda"],
      cast: ["Melanie Griffith", "David Andrews", "Tim Thomerson", "Ben Johnson", "Marshall Bell"],
      synopsis: "In a fractured future, a businessman hires a tracker to cross a lawless zone and recover a replacement robot companion.",
      trivia: ["The film was shot in Nevada before sitting unreleased for an extended period.", "Designer Robert Short created its retro-futurist world and distinctive robot imagery.", "Tim Thomerson appears here as Lester—the same actor who leads Trancers 5 as Jack Deth."],
      connections: [hub("tim-thomerson", "Tim Thomerson", "person")],
      sources: sourceSet("https://www.themoviedb.org/movie/15785-cherry-2000", "https://www.imdb.com/title/tt0092746/", "https://en.wikipedia.org/wiki/Cherry_2000")
    },
    {
      id: "from-beyond", title: "From Beyond", alternateTitles: [], type: "film", releaseYear: 1986,
      watchedDate: "2026-07-20", dateConfidence: "confirmed", category: "normal", chunkCount: null,
      runtime: 86, genres: ["Horror", "Science fiction"], poster: "assets/posters/from-beyond.jpg",
      directors: ["Stuart Gordon"], producers: ["Brian Yuzna"], writers: ["Dennis Paoli", "Stuart Gordon", "Brian Yuzna", "H. P. Lovecraft"],
      cast: ["Jeffrey Combs", "Barbara Crampton", "Ted Sorel", "Ken Foree", "Carolyn Purdy-Gordon"],
      connectionCredits: [credit("Charles Band", "Executive Producer")],
      synopsis: "Scientists activate a resonator that stimulates the pineal gland and reveals predatory beings occupying another dimension.",
      trivia: ["The film expands H. P. Lovecraft's very short 1920 story into a feature narrative.", "It reunited director Stuart Gordon, producer Brian Yuzna, and actors Jeffrey Combs and Barbara Crampton after Re-Animator.", "The production filmed at the same Rome studio where many Empire Pictures films were made."],
      sources: sourceSet("https://www.themoviedb.org/movie/14510-from-beyond", "https://www.imdb.com/title/tt0091083/", "https://en.wikipedia.org/wiki/From_Beyond_(film)")
    },
    {
      id: "morbius", title: "Morbius", alternateTitles: [], type: "film", releaseYear: 2022,
      watchedDate: null, punishmentStartDate: "2024-05-07", dateConfidence: "confirmed", category: "punishment", chunkCount: null,
      runtime: 104, genres: ["Superhero", "Horror"], poster: "assets/posters/morbius.jpg",
      directors: ["Daniel Espinosa"], producers: ["Avi Arad", "Matt Tolmach", "Lucas Foster"], writers: ["Matt Sazama", "Burk Sharpless"],
      cast: ["Jared Leto", "Matt Smith", "Adria Arjona", "Jared Harris", "Tyrese Gibson"],
      synopsis: "A biochemist's attempt to cure his rare blood disease transforms him into a superpowered pseudo-vampire.",
      trivia: ["The character originated as a Spider-Man antagonist in Marvel comics.", "The film's release moved repeatedly during the COVID-19 pandemic.", "Its internet meme resurgence prompted Sony to return the film briefly to theaters."],
      connections: [hub("sony-marvel", "Sony's Spider-Man Universe", "source")],
      sources: sourceSet("https://www.themoviedb.org/movie/526896-morbius", "https://www.imdb.com/title/tt5108870/", "https://en.wikipedia.org/wiki/Morbius_(film)")
    },
    {
      id: "clifford", title: "Clifford", alternateTitles: [], type: "film", releaseYear: 1994,
      watchedDate: null, punishmentStartDate: "2025-02-27", dateConfidence: "confirmed", category: "punishment", chunkCount: null,
      runtime: 90, genres: ["Comedy"], poster: "assets/posters/clifford.jpg",
      directors: ["Paul Flaherty"], producers: ["Larry Brezner", "Pieter Jan Brugge"], writers: ["William Porter", "Steven Kampmann"],
      cast: ["Martin Short", "Charles Grodin", "Mary Steenburgen", "Dabney Coleman", "Richard Kind"],
      synopsis: "A destructive ten-year-old played by an adult turns his uncle's life upside down in pursuit of a dinosaur theme park.",
      trivia: ["Martin Short was in his late thirties when he played the ten-year-old title character.", "Writers William Porter and Steven Kampmann were credited as Jay Dee Rock and Bobby von Hayes.", "The film was shot in 1990 but not released until 1994 after Orion Pictures' financial troubles."],
      connections: [hub("martin-short", "Martin Short", "person")],
      sources: sourceSet("https://www.themoviedb.org/movie/2778-clifford", "https://www.imdb.com/title/tt0109447/", "https://en.wikipedia.org/wiki/Clifford_(film)")
    },
    {
      id: "joker-folie-a-deux", title: "Joker: Folie à Deux", alternateTitles: ["Joker 2"], type: "film", releaseYear: 2024,
      watchedDate: null, punishmentStartDate: "2025-11-09", dateConfidence: "confirmed", category: "punishment", chunkCount: null,
      runtime: 138, genres: ["Musical", "Drama"], poster: "assets/posters/joker-folie-a-deux.jpg",
      directors: ["Todd Phillips"], producers: ["Todd Phillips", "Emma Tillinger Koskoff", "Joseph Garner"], writers: ["Scott Silver", "Todd Phillips"],
      cast: ["Joaquin Phoenix", "Lady Gaga", "Brendan Gleeson", "Catherine Keener", "Zazie Beetz"],
      synopsis: "Arthur Fleck awaits trial at Arkham and forms a volatile musical bond with fellow patient Lee Quinzel.",
      trivia: ["The sequel incorporates musical performances and reinterpretations of existing songs.", "Joaquin Phoenix returned after winning the Academy Award for the first film.", "The title is a psychiatric term for a delusion shared by two people."],
      connections: [hub("zazie-beetz", "Zazie Beetz", "person")],
      sources: sourceSet("https://www.themoviedb.org/movie/889737-joker-folie-deux", "https://www.imdb.com/title/tt11315808/", "https://en.wikipedia.org/wiki/Joker:_Folie_%C3%A0_Deux")
    }
  ],
  themes: [
    {
      id: "theme-love-and-robots", label: "Love and robots", type: "theme",
      movies: ["electric-dreams", "cherry-2000"],
      roleByMovie: { "electric-dreams": ["AI love triangle"], "cherry-2000": ["Synthetic romantic partner"] }
    },
    {
      id: "theme-psychic-powers", label: "Psychic powers", type: "theme",
      movies: ["the-fury", "from-beyond", "the-dead-zone"],
      roleByMovie: { "the-fury": ["Weaponized psychic abilities"], "from-beyond": ["Pineal-gland perception"], "the-dead-zone": ["Clairvoyant visions"] }
    },
    {
      id: "theme-machine-rebellion", label: "Machines turn murderous", type: "theme",
      movies: ["chopping-mall", "maximum-overdrive"],
      roleByMovie: { "chopping-mall": ["Security robots attack"], "maximum-overdrive": ["Machines revolt"] }
    },
    {
      id: "theme-dinosaurs", label: "Dinosaurs", type: "theme",
      movies: ["tammy-and-the-t-rex", "clifford"],
      roleByMovie: { "tammy-and-the-t-rex": ["Robotic T-Rex body"], "clifford": ["Dinosaur World obsession"] }
    },
    {
      id: "theme-killer-animals", label: "Killer animals", type: "theme",
      movies: ["shakma", "uninvited"],
      roleByMovie: { "shakma": ["Drug-altered baboon stalks the players"], "uninvited": ["Mutant cat attacks the yacht passengers"] }
    }
  ]
};

function hub(id, label, type) { return { id, label, type }; }
function credit(name, role) { return { name, role }; }
function episodeCredit(name, role, imdbNameId) { return { name, role, imdbNameId }; }
function sourceSet(tmdb, imdb, reference) {
  const values = [];
  if (tmdb) values.push({ label: tmdb.includes("themoviedb") ? "TMDB" : "IMDb", url: tmdb });
  if (imdb) values.push({ label: imdb.includes("imdb") ? "IMDb" : "Series", url: imdb });
  if (reference) values.push({ label: reference.includes("wikipedia") ? "Reference" : "Production notes", url: reference });
  return values;
}
