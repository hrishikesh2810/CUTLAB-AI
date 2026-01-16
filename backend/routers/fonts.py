from fastapi import APIRouter
import matplotlib.font_manager
import os

router = APIRouter(prefix="/fonts", tags=["fonts"])

@router.get("/")
async def get_available_fonts():
    """
    Get a list of available system fonts and common web fonts.
    """
    try:
        # Get list of system font paths
        font_paths = matplotlib.font_manager.findSystemFonts()
        fonts = []
        seen = set()
        
        # 1. Standard Web/Google Fonts (Frontend safe)
        web_fonts = [
            "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", 
            "Arial", "Times New Roman", "Courier New", "Georgia", 
            "Verdana", "Impact", "Comic Sans MS", "Helvetica"
        ]
        
        for wf in web_fonts:
            fonts.append({
                "name": wf, 
                "family": "sans-serif", # Generic fallback
                "category": "web"
            })
            seen.add(wf)

        # 2. System Fonts (Backend available for FFmpeg)
        for path in font_paths:
            try:
                # Get font properties
                prop = matplotlib.font_manager.FontProperties(fname=path)
                name = prop.get_name()
                
                # Check if it's a useful font (skip some obscure system ones)
                if name not in seen and not name.startswith("System") and not name.startswith("."):
                    fonts.append({
                        "name": name,
                        "family": prop.get_family() or "sans-serif",
                        "category": "system",
                        "path": path
                    })
                    seen.add(name)
            except:
                continue
                
        # Sort by name
        fonts.sort(key=lambda x: x["name"])
        
        return {"status": "success", "count": len(fonts), "fonts": fonts}
    except Exception as e:
        return {"status": "error", "message": str(e), "fonts": []}
