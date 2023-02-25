#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::{
    fs::{self, File},
    io::{BufRead, BufReader, Write},
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};
use tauri::{State, Window};
use walkdir::WalkDir;

static SCRAPED_FILE_NAME: &str = "scraped_file.txt";
static TO_CONVERT_DIR: &str = "to_convert";

#[derive(Debug, Clone, Serialize)]
struct ProgressPayload(f32);

#[derive(Debug, Serialize)]
struct SearchInfo {
    file_names: Vec<String>,
    total_size: u64,
}

#[tauri::command(async)]
fn search_files(path: &str, in_ext: &str) -> tauri::Result<SearchInfo> {
    let paths: Vec<PathBuf> = WalkDir::new(path)
        .into_iter()
        .filter_map(Result::ok)
        .map(|entry| entry.path().to_owned())
        .filter(|path| {
            path.display()
                .to_string()
                .to_lowercase()
                .ends_with(&format!(".{}", &in_ext))
        })
        .collect();

    let total_size = paths.iter().fold(0, |acc, entry| {
        acc + match entry.metadata() {
            Ok(file) => file.len(),
            Err(_) => 0,
        }
    });

    Ok(SearchInfo {
        file_names: paths
            .iter()
            .map(|path| path.display().to_string())
            .collect(),
        total_size,
    })
}

#[tauri::command(async)]
fn read_scrape_file(base_path: State<BasePath>) -> tauri::Result<Vec<String>> {
    let path = Path::new(&base_path.0).join(SCRAPED_FILE_NAME);
    let file = match File::open(&path) {
        Ok(f) => f,
        Err(_) => return Ok(Vec::new()),
    };
    let reader = BufReader::new(file);
    let lines = reader.lines().collect::<Result<_, _>>()?;

    Ok(lines)
}

#[tauri::command(async)]
fn gather_files(files: Vec<String>, in_ext: &str, base_path: State<BasePath>) -> tauri::Result<()> {
    let scrape_file_path = Path::new(&base_path.0).join(SCRAPED_FILE_NAME);
    let dir_path = Path::new(&base_path.0).join(TO_CONVERT_DIR);

    let mut save_file = File::create(&scrape_file_path)?;
    save_file.write_all(files.join("\n").as_bytes())?;

    if !dir_path.exists() {
        fs::create_dir(&dir_path).expect("Could not create folder for items to convert");
    }

    for (i, file) in files.iter().enumerate() {
        fs::copy(file, dir_path.join(format!("{}.{}", i, &in_ext)))
            .expect("Could not copy file: {file} to path {}");
    }

    Ok(())
}

#[tauri::command(async)]
fn restore_files(
    in_ext: &str,
    out_ext: &str,
    base_path: State<BasePath>,
    window: Window,
) -> tauri::Result<()> {
    let dir_path = Path::new(&base_path.0).join(TO_CONVERT_DIR);
    let files_scraped = read_scrape_file(base_path)?;

    let total_length = files_scraped.iter().len();

    for (i, old_file_path) in files_scraped.iter().enumerate() {
        window.emit(
            "PROGRESS",
            ProgressPayload((i + 1) as f32 / total_length as f32),
        )?;

        let new_file = dir_path.join(format!("{i}.{out_ext}"));
        let old_file = dir_path.join(format!("{i}.{in_ext}"));

        let new_path = old_file_path.replace(&format!(".{in_ext}"), &format!(".{out_ext}"));
        let new_path = Path::new(&new_path);

        // Always delete the file with the new extension
        if new_file.exists() {
            // Only copy it if there's no file with the same path already there
            if !new_path.exists() {
                fs::copy(&new_file, new_path)?;
            }

            fs::remove_file(&new_file)?;

            // Only remove the old file if it has been converted
            if old_file.exists() {
                fs::remove_file(old_file)?;
            }
        }
    }

    Ok(())
}

#[derive(Debug, thiserror::Error)]
enum MoveError {
    #[error("failed to strip input directory from path")]
    StripPrefixError(#[from] std::path::StripPrefixError),
    #[error("Input and Output directory should not be the same")]
    SameDirectoryError,
    #[error(transparent)]
    CreateDirError(#[from] std::io::Error),
    #[error(transparent)]
    TauriError(#[from] tauri::Error),
}

impl serde::Serialize for MoveError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

#[tauri::command(async)]
fn move_files(
    ext: &str,
    input_directory: &str,
    output_directory: &str,
    window: Window,
) -> Result<(), MoveError> {
    if input_directory == output_directory {
        return Err(MoveError::SameDirectoryError);
    }

    let files = search_files(input_directory, ext)?;
    let total_length = files.file_names.len();

    for (i, file) in files.file_names.iter().enumerate() {
        window.emit(
            "PROGRESS",
            ProgressPayload((i + 1) as f32 / total_length as f32),
        )?;

        let stripped_path = Path::new(file).strip_prefix(input_directory)?;
        let new_path = Path::new(output_directory).join(stripped_path);

        if new_path.exists() {
            continue;
        }

        // Doing .ancestors() without first doing .parent() gives you the file
        // too, not just the dirs
        if let Some(parent) = new_path.parent() {
            if let Some(ancestors) = parent.ancestors().next() {
                dbg!(&ancestors);
                fs::create_dir_all(ancestors)?;
                fs::copy(file, new_path)?;
                fs::remove_file(file)?;
            }
        }
    }

    Ok(())
}

#[derive(Serialize, Deserialize)]
struct BasePath(PathBuf);

fn main() {
    let base_path = tauri::api::path::desktop_dir().expect("$DESKTOP scope must be set");

    tauri::Builder::default()
        .manage(BasePath(base_path))
        .invoke_handler(tauri::generate_handler![
            search_files,
            gather_files,
            read_scrape_file,
            restore_files,
            move_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
