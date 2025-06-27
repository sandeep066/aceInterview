"""
Setup script for Python backend
"""
from setuptools import setup, find_packages

setup(
    name="ai-interview-platform",
    version="2.0.0",
    description="AI Interview Practice Platform with Pydantic AI",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        "pydantic-ai==0.0.14",
        "pydantic==2.10.3",
        "fastapi==0.115.6",
        "uvicorn==0.32.1",
        "python-dotenv==1.0.1",
        "httpx==0.28.1",
        "openai==1.57.2",
        "anthropic==0.40.0",
        "google-generativeai==0.8.3",
        "livekit==0.17.4",
        "livekit-agents==0.10.4",
        "python-multipart==0.0.12",
        "websockets==13.1",
        "aiofiles==24.1.0",
        "loguru==0.7.2"
    ],
    extras_require={
        "dev": [
            "pytest",
            "pytest-asyncio",
            "black",
            "flake8",
            "mypy"
        ]
    }
)