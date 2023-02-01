import { useState } from "react";
import { open } from "@tauri-apps/api/dialog";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";

function App() {
  const [message, setMessage] = useState("");
  const [restoreAvailable, setRestoreAvailable] = useState(false);
  const [inExt, setInExt] = useState("indd");
  const [outExt, setOutExt] = useState("idml");
  const [files, setFiles] = useState<string[]>([]);

  async function selectDirectory() {
    if (!inExt || !outExt) {
      setMessage(
        "You MUST set the input file extension and output file extension."
      );
      return;
    }

    const selected = await open({ directory: true });
    if (!selected || Array.isArray(selected)) {
      return;
    }

    console.log(selected);

    invoke("gather_files", { path: selected, inExt })
      .then((files) => {
        setMessage("FILES COPIED TO desktop/to_convert");
        setRestoreAvailable(true);

        if (Array.isArray(files)) {
          setFiles(files);
        }
      })
      .catch(console.error);
  }

  async function restoreFiles() {
    invoke("restore_files", { inExt, outExt })
      .then(() => setMessage("FILES RESTORED"))
      .catch(console.error);
  }

  return (
    <div className="container">
      <h1>Welcome to Tauri!</h1>

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
      <div>
        <button onClick={selectDirectory}>Choose directory</button>
        <button onClick={restoreFiles}>Restore files</button>
      </div>
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
