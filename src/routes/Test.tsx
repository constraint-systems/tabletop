import { useEffect, useRef } from "react";

function Test() {
  const streamRef = useRef<MediaStream | null>(null);
  function getStream() {
    navigator.mediaDevices
      .getUserMedia({
        video: { width: 1920, height: 1080 },
      })
      .then((stream) => {
        streamRef.current = stream;
        for (const track of stream.getTracks()) {
          console.log(track.getSettings().height);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }
  function stopStream() {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        console.log("Stopping track");
        track.stop();
      }
    }
  }

  useEffect(() => {
    getStream();
    return stopStream;
  }, []);

  return (
    <div>
      <button onClick={getStream}>Get Stream</button>
      <button onClick={stopStream}>Stop Stream</button>
    </div>
  );
}

export default Test;
