import { useState } from "react";
import { open } from "@tauri-apps/api/dialog";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";

function App() {
  const [message, setMessage] = useState("");
  const [inExt, setInExt] = useState("indd");
  const [outExt, setOutExt] = useState("idml");
  const [files, setFiles] = useState<string[]>([]);
  const [selectedDirectory, setSelectedDirectory] = useState("");
  const [error, setError] = useState<string>();

  async function selectDirectory() {
    const selected = await open({ directory: true });
    if (!selected || Array.isArray(selected)) {
      return;
    }

    setSelectedDirectory(selected);
    setMessage("SELECTED: " + selected);
  }

  async function searchFiles() {
    invoke("search_files", { path: selectedDirectory, inExt })
      .then((files) => {
        console.log(files);
        setMessage("FILES FOUND:");
        if (Array.isArray(files)) {
          setFiles(files);
        }
      })
      .catch((err) => {
        console.error(err);
        setError(JSON.stringify(err));
      });
  }

  async function gatherFiles() {
    if (!selectedDirectory) {
      setMessage("NO DIRECTORY SELECTED");
      return;
    }

    invoke("gather_files", { files, inExt })
      .then(() => {
        setMessage("FILES COPIED TO desktop/to_convert");
      })
      .catch((err) => {
        console.error(err);
        setError(JSON.stringify(err));
      });
  }

  async function restoreFiles() {
    invoke("restore_files", { inExt, outExt })
      .then(() => setMessage("FILES RESTORED"))
      .catch((err) => {
        console.error(err);
        setError(JSON.stringify(err));
      });
  }

  return (
    <div className="container">
      <div className="input-grid">
        <label htmlFor="in">Input file extension</label>
        <input
          id="in"
          name="in"
          type="text"
          value={inExt}
          onChange={(e) => setInExt(e.target.value)}
        />
        <label htmlFor="out">Output file extension</label>
        <input
          id="out"
          name="out"
          type="text"
          value={outExt}
          onChange={(e) => setOutExt(e.target.value)}
        />
      </div>
      <div className="row">
        {/* These disabled checks are dumb */}
        <button disabled={!inExt || !outExt} onClick={selectDirectory}>
          Choose directory
        </button>
        <button
          disabled={!inExt || !outExt || !selectDirectory}
          onClick={searchFiles}
        >
          Search files
        </button>
        <button
          disabled={!inExt || !outExt || !selectedDirectory || !files}
          onClick={gatherFiles}
        >
          Gather files
        </button>
        <button disabled={!inExt || !outExt} onClick={restoreFiles}>
          Restore files
        </button>
      </div>
      {error && <p>ERROR: {error}</p>}
      <p>{message}</p>

      {files.length > 0 && (
        <ol className="file-list" start={0}>
          {files.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default App;
