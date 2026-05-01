const axios = require("axios");

exports.getLibrary = async (req, res) => {
  try {
    const apiKey = String(process.env.PIXABAY_API_KEY || "").trim();
    if (!apiKey) {
      return res.status(500).json({ msg: "Pixabay API key not configured" });
    }

    const response = await axios.get("https://pixabay.com/api/audio/", {
      params: {
        key: apiKey,
        q: "music",
        per_page: 20
      }
    });

    const tracks = response.data.hits.map((hit) => ({
      id: `pixabay-${hit.id}`,
      title: hit.tags.split(",")[0]?.trim() || "Untitled",
      artist: "Pixabay Audio",
      url: hit.audio,
      license: "Pixabay License",
      source: "library",
      genre: hit.tags.split(",")[1]?.trim() || "Ambient"
    }));

    return res.json({ tracks });
  } catch (error) {
    console.error("Error fetching from Pixabay:", error.response?.status, error.response?.data || error.message);

    const fallbackTracks = [
      {
        id: "fallback-1",
        title: "KeyVoid metal Beat",
        artist: "KeyVoid Studio",
        url: "https://pixabay.com/music/search/metal/",
        license: "Public sample",
        source: "fallback",
        genre: "Metal"
      },
      {
        id: "fallback-2",
        title: "KeyVoid rock Loop",
        artist: "KeyVoid Studio",
        url: "https://file-examples.com/wp-content/uploads/2017/11/file_example_MP3_1MG.mp3",
        license: "Public sample",
        source: "fallback",
        genre: "Rock"
      },
      {
        id: "fallback-3",
        title: "KeyVoid Demo Track",
        artist: "KeyVoid Studio",
        url: "https://file-examples.com/wp-content/uploads/2017/11/file_example_MP3_2MG.mp3",
        license: "Public sample",
        source: "fallback",
        genre: "Synth"
      }
    ];

    return res.json({ tracks: fallbackTracks, fallback: true });
  }
};
