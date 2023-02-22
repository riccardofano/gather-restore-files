import { SetStateAction, useState } from "react";
import { open } from "@tauri-apps/api/dialog";
import { invoke } from "@tauri-apps/api";

import { SearchResults } from "./Convert";

function Move() {
  const [ext, setExt] = useState("indd");
  const [searchResults, setSearchResults] = useState<SearchResults>({
    file_names: [],
    total_size: 0,
  });
  const [inputDirectory, setInputDirectory] = useState("");
  const [outputDirectory, setOutputDirectory] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState<string>();

  function logError(err: unknown) {
    setError(JSON.stringify(err));
    console.log(error);
  }

  async function selectDirectory(
    setFunction: React.Dispatch<SetStateAction<string>>
  ) {
    const selected = await open({ directory: true });
    if (!selected || Array.isArray(selected)) {
      return;
    }

    setFunction(selected);
    setMessage("SELECTED: " + selected);
  }

  async function searchFiles() {
    invoke("search_files", { path: inputDirectory, ext })
      .then((res) => {
        console.log(res);
        setMessage("FILES FOUND:");
        setSearchResults(res as SearchResults);
      })
      .catch(logError);
  }

  async function moveFiles() {
    invoke("move_files", { path: inputDirectory, outPath: outputDirectory });
  }

  return (
    <>
      <label>
        Input file extension
        <input
          type="text"
          value={ext}
          onChange={(e) => setExt(e.target.value)}
        />
      </label>

      <label>
        Input directory
        <div className="flex items-center gap-4">
          <p className="inputlike">
            {inputDirectory || "No directory selected"}
          </p>
          <button onClick={() => selectDirectory(setInputDirectory)}>
            Select
          </button>
        </div>
      </label>

      <label>
        Output directory
        <div className="flex items-center gap-4">
          <p className="inputlike">
            {outputDirectory || "No directory selected"}
          </p>
          <button onClick={() => selectDirectory(setOutputDirectory)}>
            Select
          </button>
        </div>
      </label>

      <div className="mt-8 flex gap-4 mx-auto">
        <button onClick={searchFiles}>List files</button>
        <button onClick={moveFiles}>Move files</button>
      </div>
      {error && <p>ERROR: {error}</p>}
      <p>{message}</p>

      {searchResults.total_size > 0 && (
        <p>{(searchResults.total_size / 1000_000_000).toFixed(2)} GB</p>
      )}

      {searchResults.file_names.length > 0 && (
        <ol className="file-list" start={0}>
          {searchResults.file_names.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ol>
      )}
    </>
  );
}

export default Move;
