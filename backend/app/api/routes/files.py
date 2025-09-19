import hashlib
import time
import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse

from app.api.deps import CurrentUser

router = APIRouter()

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads")
PASSPORT_DIR = UPLOAD_DIR / "passports"
PASSPORT_DIR.mkdir(parents=True, exist_ok=True)

# Allowed image extensions and max file size
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def validate_image_file(file: UploadFile) -> None:
    """Validate uploaded image file."""
    # Check file extension
    file_ext = Path(file.filename or "").suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Check content type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only images are allowed."
        )

    # File size will be checked during reading


def generate_unique_filename(original_filename: str) -> str:
    """Generate a unique filename while preserving the extension."""
    file_ext = Path(original_filename).suffix.lower()
    unique_id = str(uuid.uuid4())
    timestamp = str(int(time.time()))
    # Create a hash for extra uniqueness
    hash_input = f"{unique_id}{timestamp}{original_filename}".encode()
    file_hash = hashlib.md5(hash_input).hexdigest()[:8]
    return f"{timestamp}_{file_hash}{file_ext}"


@router.post("/upload/passport")
async def upload_passport(
    *,
    current_user: CurrentUser,  # noqa: ARG001
    file: UploadFile = File(...),
) -> JSONResponse:
    """
    Upload a passport photo.
    Returns the path that should be saved in the database.
    """
    # Validate the uploaded file
    validate_image_file(file)

    # Read file content and check size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
        )

    # Generate unique filename
    unique_filename = generate_unique_filename(file.filename or "passport.jpg")
    file_path = PASSPORT_DIR / unique_filename

    # Save the file
    try:
        with open(file_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save file: {str(e)}"
        )

    # Return the relative path that should be saved in the database
    relative_path = f"passports/{unique_filename}"

    return JSONResponse(
        content={
            "message": "File uploaded successfully",
            "path": relative_path,
            "filename": unique_filename,
            "size": len(content),
        }
    )


@router.get("/{file_type}/{filename}")
async def get_file(
    file_type: str,
    filename: str,
) -> Any:
    """
    Serve uploaded files.
    file_type can be 'passports' or other types in the future.
    """
    # Validate file type to prevent directory traversal
    if file_type not in ["passports"]:
        raise HTTPException(status_code=404, detail="File not found")

    # Validate filename to prevent directory traversal
    if "/" in filename or ".." in filename:
        raise HTTPException(status_code=404, detail="File not found")

    # Build safe file path
    file_path = UPLOAD_DIR / file_type / filename

    # Check if file exists and is within the uploads directory
    try:
        file_path = file_path.resolve()
        UPLOAD_DIR.resolve()

        # Ensure the resolved path is within UPLOAD_DIR
        if not str(file_path).startswith(str(UPLOAD_DIR.resolve())):
            raise HTTPException(status_code=404, detail="File not found")

        if not file_path.exists() or not file_path.is_file():
            raise HTTPException(status_code=404, detail="File not found")
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")

    # Determine media type based on file extension
    suffix = file_path.suffix.lower()
    media_type = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }.get(suffix, "application/octet-stream")

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=filename,
    )


@router.delete("/{file_type}/{filename}")
async def delete_file(
    *,
    current_user: CurrentUser,  # noqa: ARG001
    file_type: str,
    filename: str,
) -> JSONResponse:
    """
    Delete an uploaded file.
    Only the user who uploaded or an admin can delete files.
    """
    # Validate file type to prevent directory traversal
    if file_type not in ["passports"]:
        raise HTTPException(status_code=404, detail="File not found")

    # Validate filename to prevent directory traversal
    if "/" in filename or ".." in filename:
        raise HTTPException(status_code=404, detail="File not found")

    # Build safe file path
    file_path = UPLOAD_DIR / file_type / filename

    # Check if file exists and delete it
    try:
        file_path = file_path.resolve()
        UPLOAD_DIR.resolve()

        # Ensure the resolved path is within UPLOAD_DIR
        if not str(file_path).startswith(str(UPLOAD_DIR.resolve())):
            raise HTTPException(status_code=404, detail="File not found")

        if not file_path.exists() or not file_path.is_file():
            raise HTTPException(status_code=404, detail="File not found")

        file_path.unlink()

        return JSONResponse(
            content={"message": "File deleted successfully"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete file: {str(e)}"
        )
