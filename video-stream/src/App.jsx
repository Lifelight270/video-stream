import { useEffect, useState } from "react";
import axios from "axios";

const App = () => {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    axios
      .get("http://localhost:3000/videos")
      .then((res) => setVideos(res.data))
      .catch((err) => console.error("Failed to fetch videos", err));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-6">🎬 Video Library</h1>

      <div className="mb-4 space-y-2">
        {videos.map((video) => (
          <button
            key={video.id}
            onClick={() => setSelectedVideo(video)}
            className="block text-left w-full px-4 py-2 bg-white rounded shadow hover:bg-blue-100">
            {video.title}
          </button>
        ))}
      </div>

      {selectedVideo && (
        <div className="mt-6 bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">{selectedVideo.title}</h2>
          <video
            controls
            width="100%"
            className="rounded"
            src={`http://localhost:3000/video/${selectedVideo.id}`}
            poster="https://dummyimage.com/640x360/000/fff&text=Video+Preview">
            Your browser does not support the video tag.
          </video>
        </div>
      )}
    </div>
  );
};

export default App;
