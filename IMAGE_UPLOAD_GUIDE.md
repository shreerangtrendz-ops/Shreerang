# Bulk Image Upload Guide

## Overview
The system allows uploading images via Local Files or Google Drive, with automatic compression to ~5MB.

## Local Upload
1. Navigate to **Admin > Bulk Image Upload**.
2. Select "Local Files" tab.
3. Drag & drop multiple images.
4. Select **Base Fabric** and **Finish Fabric**.
5. Click **Start Upload**.

## Google Drive Upload
1. Navigate to **Admin > Bulk Image Upload**.
2. Select "Google Drive" tab.
3. Paste the public link of a Drive Folder.
4. Click **Connect**.
5. Select images to import.

## Compression Logic
- Images > 5MB are compressed using canvas scaling and quality adjustment.
- Images <= 5MB are uploaded as-is.
- Target format: JPEG.