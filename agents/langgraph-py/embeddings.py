"""
Local embeddings via sentence-transformers — mirrors apps/studio/lib/embeddings.ts
so the Python and TypeScript agents share the exact same vector space
(same model, same 768 dims, same Supabase `documents` table).

Model: sentence-transformers/all-mpnet-base-v2. First call downloads
~420 MB to ~/.cache/torch/sentence_transformers (or $SENTENCE_TRANSFORMERS_HOME),
then stays cached.
"""
import os

_model = None

EMBEDDING_DIMS = 768


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        model_name = os.environ.get("EMBEDDING_MODEL_ST", "sentence-transformers/all-mpnet-base-v2")
        _model = SentenceTransformer(model_name)
    return _model


def embed(text: str) -> list[float]:
    model = _get_model()
    vec = model.encode(text, normalize_embeddings=True)
    return vec.tolist()
