#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::{
    fs::{self, File, OpenOptions},
    io::{BufRead, BufReader, Write},
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};
use tauri::State;
use walkdir::WalkDir;

static SCRAPED_FILE_NAME: &str = "scraped_file.txt";
static TO_CONVERT_DIR: &str = "to_convert";

#[derive(Debug, Serialize)]
struct SearchInfo {
    file_names: Vec<String>,
    total_size: u64,
}

#[tauri::command]
fn search_files(path: &str, in_ext: &str) -> tauri::Result<SearchInfo> {
    let mut sum = 0;
    let files: Vec<String> = WalkDir::new(path)
        .into_iter()
        .filter_map(Result::ok)
        .map(|entry| {
            sum += match entry.metadata() {
                Ok(file) => file.len(),
                Err(_) => 0,
            };
            entry
                .path()
                .strip_prefix(path)
                .expect("to have the path to the folder used for the search as its root")
                .display()
                .to_string()
        })
        .filter(|p| p.to_lowercase().ends_with(&format!(".{}", &in_ext)))
        .collect();

    Ok(SearchInfo {
        file_names: files,
        total_size: sum,
    })
}

#[tauri::command]
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

#[tauri::command]
fn gather_files(files: Vec<String>, in_ext: &str, base_path: State<BasePath>) -> tauri::Result<()> {
    let scrape_file_path = Path::new(&base_path.0).join(SCRAPED_FILE_NAME);
    let dir_path = Path::new(&base_path.0).join(TO_CONVERT_DIR);

    let mut save_file = OpenOptions::new()
        .write(true)
        .create(true)
        .open(&scrape_file_path)?;
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

#[tauri::command]
fn restore_files(in_ext: &str, out_ext: &str, base_path: State<BasePath>) -> tauri::Result<()> {
    let dir_path = Path::new(&base_path.0).join(TO_CONVERT_DIR);
    let files_scraped = read_scrape_file(base_path)?;

    for (i, old_file_path) in files_scraped.iter().enumerate() {
        let new_file = dir_path.join(format!("{i}.{out_ext}"));
        let old_file = dir_path.join(format!("{i}.{in_ext}"));

        let new_path = old_file_path.replace(&format!(".{in_ext}"), &format!(".{out_ext}"));
        let new_path = Path::new(&new_path);

        // allow deleting files in `to_convert` directory
        if new_file.exists() && !new_path.exists() {
            fs::copy(&new_file, new_path)?;
            fs::remove_file(new_file)?;

            if old_file.exists() {
                fs::remove_file(old_file)?;
            }
        }
    }

    Ok(())
}

#[tauri::command]
fn move_files(ext: &str, input_directory: &str, output_directory: &str) -> tauri::Result<()> {
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
