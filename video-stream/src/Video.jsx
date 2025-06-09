import React, { useEffect, useState } from "react";
import axios from "axios";

const Video = () => {
  const [videos, setVideos] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchVideos = async () => {
    try {
      const res = await axios.get("http://localhost:3000/videos");
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
      await axios.post("http://localhost:3000/upload", formData);
      setUploading(false);
      setFile(null);
      await fetchVideos();
    } catch (err) {
      console.error("Upload error:", err);
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-12 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-blue-700">YouTube Clone 🎥</h1>

          <form onSubmit={handleUpload} className="flex items-center space-x-3">
            <input
              type="file"
              accept="video/mp4"
              onChange={(e) => setFile(e.target.files[0])}
              className="file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
            />
            <button
              type="submit"
              disabled={uploading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded disabled:opacity-50">
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </form>
        </div>

        {/* Video grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {videos.length === 0 ? (
            <p className="col-span-full text-center text-gray-500">
              No videos uploaded yet.
            </p>
          ) : (
            videos.map((video) => (
              <div
                key={video._id}
                className="bg-white rounded-lg overflow-hidden shadow hover:shadow-md transition"
                onClick={() => setSelectedId(video._id)}>
                <div className="bg-black aspect-video flex items-center justify-center text-white text-sm">
                  🎬 {video.filename.slice(0, 30)}...
                </div>
                <div className="p-3">
                  <p className="text-gray-800 font-semibold text-sm truncate">
                    {video.filename}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Video player */}
        {selectedId && (
          <div className="mt-10">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Now Playing:
            </h2>
            <video
              controls
              className="w-full rounded-xl shadow-md border"
              src={`http://localhost:3000/video/${selectedId}`}
              preload="metadata"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Video;
