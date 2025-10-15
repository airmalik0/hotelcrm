import io
from typing import Tuple, Optional

from PIL import Image


class ImageUtils:
    @staticmethod
    def compress_image(
        image_bytes: bytes,
        max_size: Tuple[int, int] = (200, 200),
        target_max_bytes: int = 200 * 1024,
        initial_quality: int = 80,
        min_quality: int = 40,
        min_side_limit: int = 200,
    ) -> Tuple[bytes, str]:
        """Compress image to stay within max dimensions and target size.

        Returns tuple of (compressed_bytes, mime_type).
        """
        with Image.open(io.BytesIO(image_bytes)) as img:
            # Convert to RGB to ensure JPEG compatibility
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")

            # Resize keeping aspect ratio
            img.thumbnail(max_size, Image.LANCZOS)

            # Try iterative quality reduction to fit in target_max_bytes
            quality = initial_quality

            def encode(current_img: Image.Image, q: int) -> bytes:
                buf = io.BytesIO()
                current_img.save(buf, format="JPEG", quality=q, optimize=True, progressive=True)
                return buf.getvalue()

            data = encode(img, quality)

            # Reduce quality first
            while len(data) > target_max_bytes and quality > min_quality:
                quality = max(min_quality, quality - 5)
                data = encode(img, quality)

            # If still too big, iteratively downscale dimensions and reset quality
            while len(data) > target_max_bytes and (img.width > min_side_limit or img.height > min_side_limit):
                # scale down by 85%
                new_w = max(min_side_limit, int(img.width * 0.85))
                new_h = max(min_side_limit, int(img.height * 0.85))
                img = img.resize((new_w, new_h), Image.LANCZOS)
                quality = initial_quality
                data = encode(img, quality)
                while len(data) > target_max_bytes and quality > min_quality:
                    quality = max(min_quality, quality - 5)
                    data = encode(img, quality)

            return data, "image/jpeg"


