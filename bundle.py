#!/usr/bin/python

import os
import hashlib
import shutil

# --- Configuration ---
SOURCE_DIR = "."
DEST_DIR = "dist"
EXTENSIONS_TO_HASH = [".js", ".css", ".svg"]
EXTENSIONS_TO_UPDATE = [".html", ".js", ".css"]

# Fichiers et dossiers à ignorer totalement
IGNORE_FILES = {
    "LICENSE", "README.md", "TODO", "bundle.py",
    "initialize.sh", "package-lock.json", "package.json",
    "start.sh", "stop.sh", ".gitignore"
}
IGNORE_DIRS = {".git", "node_modules", DEST_DIR}

def get_file_hash(filepath):
    hasher = hashlib.md5()
    with open(filepath, 'rb') as f:
        buf = f.read()
        hasher.update(buf)
    return hasher.hexdigest()[:8]

def run_bundle():
    # Nettoyage propre du dossier de destination
    if os.path.exists(DEST_DIR):
        shutil.rmtree(DEST_DIR)
    os.makedirs(DEST_DIR)

    hash_map = {}

    # 1. Parcours et copie sélective
    for root, dirs, files in os.walk(SOURCE_DIR):
        # On filtre les dossiers à ignorer sur place pour que walk ne s'y aventure pas
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
       
        for file in files:
            if file in IGNORE_FILES:
                continue
               
            ext = os.path.splitext(file)[1]
            rel_path = os.path.relpath(os.path.join(root, file), SOURCE_DIR)
           
            # Déterminer le nom de destination (avec ou sans hash)
            if ext in EXTENSIONS_TO_HASH:
                h = get_file_hash(os.path.join(root, file))
                new_name = f"{os.path.splitext(file)[0]}.{h}{ext}"
                hash_map[rel_path] = new_name
            else:
                new_name = file

            dest_path = os.path.join(DEST_DIR, os.path.dirname(rel_path), new_name)
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            shutil.copy2(os.path.join(root, file), dest_path)

    # 2. Mise à jour des références
    for root, dirs, files in os.walk(DEST_DIR):
        for file in files:
            if os.path.splitext(file)[1] in EXTENSIONS_TO_UPDATE:
                file_path = os.path.join(root, file)
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                # On remplace les anciennes références par les nouvelles
                # On trie par longueur décroissante pour éviter de remplacer "style.css" dans "mon-style.css"
                for old_rel_path in sorted(hash_map.keys(), key=len, reverse=True):
                    old_name = os.path.basename(old_rel_path)
                    new_hashed_name = hash_map[old_rel_path]
                    if old_name in content:
                        content = content.replace(old_name, new_hashed_name)

                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)

    print(f"Build terminé dans /{DEST_DIR}")
    print(f"Fichiers hashés : {len(hash_map)}")

if __name__ == "__main__":
    run_bundle()
