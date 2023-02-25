interface FileListProps {
  files: string[];
}

function FileList({ files }: FileListProps) {
  if (files.length < 1) {
    return null;
  }

  return (
    <table>
      <tbody>
        {files.map((file, i) => (
          <tr key={i}>
            <td className="text-right align-top pr-4">{i}</td>
            <td>{file}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default FileList;
