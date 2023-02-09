import { useState } from "react";
import { open } from "@tauri-apps/api/dialog";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";
import { P } from "@tauri-apps/api/event-2a9960e7";

interface SearchResults {
  file_names: string[];
  total_size: number;
}

function App() {
  const [message, setMessage] = useState("");
  const [inExt, setInExt] = useState("indd");
  const [outExt, setOutExt] = useState("idml");
  const [searchResults, setSearchResults] = useState<SearchResults>();
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
      .then((res) => {
        console.log(res);
        setMessage("FILES FOUND:");
        setSearchResults(res as SearchResults);
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

    invoke("gather_files", { files: searchResults?.file_names, inExt })
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
        <button onClick={selectDirectory}>Choose directory</button>
        <button onClick={searchFiles}>Search files</button>
        <button onClick={gatherFiles}>Gather files</button>
        <button onClick={restoreFiles}>Restore files</button>
      </div>
      {error && <p>ERROR: {error}</p>}
      <p>{message}</p>

      {searchResults?.total_size && (
        <p>{(searchResults.total_size / 1000_000_000).toFixed(2)} GB</p>
      )}
      {searchResults?.file_names && searchResults.file_names.length > 0 && (
        <ol className="file-list" start={0}>
          {searchResults?.file_names.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default App;
