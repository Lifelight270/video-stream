import React, { useEffect, useState } from "react";
import axios from "axios";

const Video = () => {
  const [videos, setVideos] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchVideos = async () => {
    try {
      const res = await axios.get("https://video-stream-yng0.onrender.com/videos");
      setVideos(res.data);
    } catch (error) {
      console.error("Error fetching videos:", error);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a video file.");

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      await axios.post("https://video-stream-yng0.onrender.com/upload", formData);
      setUploading(false);
      setFile(null);
      await fetchVideos();
    } catch (err) {
      console.error("Upload error:", err);
      setUploading(false);
    }
  };

  return (
    <div className="p-6 md:p-12 bg-gradient-to-b from-blue-50 to-white min-h-screen font-sans">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-2xl shadow-xl">
        <h1 className="text-3xl font-bold mb-4 text-center text-blue-700">
          🎥 MongoDB Video Gallery
        </h1>

        {/* Upload form */}
        <form
          onSubmit={handleUpload}
          className="flex flex-col md:flex-row items-center gap-4 mb-6">
          <input
            type="file"
            accept="video/mp4"
            onChange={(e) => setFile(e.target.files[0])}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
          />
          <button
            type="submit"
            disabled={uploading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded disabled:opacity-50">
            {uploading ? "Uploading..." : "Upload Video"}
          </button>
        </form>

        {/* Video list */}
        <div className="space-y-3">
          {videos.length === 0 ? (
            <p className="text-gray-500 text-center">No videos uploaded yet.</p>
          ) : (
            videos.map((video) => (
              <button
                key={video._id}
                onClick={() => setSelectedId(video._id)}
                className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg shadow-sm transition">
                🎬 {video.filename}
              </button>
            ))
          )}
        </div>

        {/* Video Player */}
        {selectedId && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2 text-gray-800">
              📺 Now Playing
            </h2>
            <video
              controls
              width="100%"
              className="rounded-lg border border-gray-300 shadow-sm"
              src={`https://video-stream-yng0.onrender.com/video/${selectedId}`}
              preload="metadata"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Video;
