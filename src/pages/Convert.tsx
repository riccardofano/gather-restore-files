import { useEffect, useState } from "react";
import { open } from "@tauri-apps/api/dialog";
import { invoke } from "@tauri-apps/api/tauri";

export interface SearchResults {
  file_names: string[];
  total_size: number;
}

function Convert() {
  const [message, setMessage] = useState("");
  const [inExt, setInExt] = useState("indd");
  const [outExt, setOutExt] = useState("idml");
  const [searchResults, setSearchResults] = useState<SearchResults>({
    file_names: [],
    total_size: 0,
  });
  const [selectedDirectory, setSelectedDirectory] = useState("");
  const [error, setError] = useState<string>();

  function logError(err: unknown) {
    setError(JSON.stringify(err));
    console.log(error);
  }

  useEffect(() => {
    function showSavedFiles(file_names: string[]) {
      setSearchResults((previous) => ({ ...previous, file_names }));
    }

    invoke("read_scrape_file")
      .then((file_names) => {
        console.log(file_names);
        showSavedFiles(file_names as string[]);
      })
      .catch(logError);
  }, []);

  async function selectDirectory() {
    const selected = await open({ directory: true });
    if (!selected || Array.isArray(selected)) {
      return;
    }

    setSelectedDirectory(selected);
  }

  async function searchFiles() {
    invoke("search_files", { path: selectedDirectory, inExt })
      .then((res) => {
        console.log(res);
        setSearchResults(res as SearchResults);
      })
      .catch(logError);
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
      .catch(logError);
  }

  async function restoreFiles() {
    invoke("restore_files", { inExt, outExt })
      .then(() => setMessage("FILES RESTORED"))
      .catch(logError);
  }

  return (
    <>
      <label>
        Input file extension
        <input
          type="text"
          value={inExt}
          onChange={(e) => setInExt(e.target.value)}
        />
      </label>
      <label>
        Output file extension
        <input
          type="text"
          value={outExt}
          onChange={(e) => setOutExt(e.target.value)}
        />
      </label>

      <label>
        Input directory
        <div className="flex items-center gap-4">
          <p className="inputlike">
            {selectedDirectory || "No directory selected"}
          </p>
          <button onClick={selectDirectory} className="btn">
            Select
          </button>
        </div>
      </label>

      <div className="mt-8 flex gap-4 mx-auto">
        <button onClick={searchFiles}>List files</button>
        <button onClick={gatherFiles}>Gather files</button>
        <button onClick={restoreFiles}>Restore files</button>
      </div>
      {error && <p>ERROR: {error}</p>}
      <p>{message}</p>

      {searchResults.total_size > 0 && (
        <p>
          Total files size:{" "}
          {(searchResults.total_size / 1000_000_000).toFixed(2)} GB
        </p>
      )}

      {searchResults.file_names.length > 0 && (
        <ol className="list-decimal" start={0}>
          {searchResults.file_names.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ol>
      )}
    </>
  );
}

export default Convert;