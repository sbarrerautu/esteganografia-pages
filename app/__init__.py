import os
import time

from flask import Flask, jsonify

from app.models.session_store import ensure_challenge_images
from app.routes.game_routes import game_bp


def create_app():
    app = Flask(__name__, template_folder="../templates", static_folder="../static")
    app.config["SECRET_KEY"] = "stegchallenge-dev-secret-key"
    app.config["MAX_CONTENT_LENGTH"] = 3 * 1024 * 1024
    app.config["ASSET_VERSION"] = os.environ.get("ASSET_VERSION", str(int(time.time())))

    @app.context_processor
    def inject_asset_version():
        return {"asset_version": app.config["ASSET_VERSION"]}

    @app.get("/healthz")
    def healthz():
        return jsonify({"ok": True, "status": "ready"}), 200

    app.register_blueprint(game_bp)
    ensure_challenge_images(app.static_folder)
    return app
