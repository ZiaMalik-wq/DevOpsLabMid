from qdrant_client import QdrantClient
from qdrant_client.http import models
from functools import lru_cache
from app.core.config import settings


class VectorDB:
    _instance = None
    client = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(VectorDB, cls).__new__(cls)
        return cls._instance

    def _connect(self):
        if self.client is None:
            print("Connecting to Qdrant...")
            
            self.client = QdrantClient(
                url=settings.QDRANT_URL,
                api_key=settings.QDRANT_API_KEY
            )

            try:
                self.client.get_collection(settings.QDRANT_COLLECTION)
                print(f"Collection OK: {settings.QDRANT_COLLECTION}")
            except Exception:
                self.client.create_collection(
                    collection_name=settings.QDRANT_COLLECTION,
                    vectors_config=models.VectorParams(
                        size=384,
                        distance=models.Distance.COSINE
                    )
                )
                print("Collection created.")

    def upsert_job(self, job_id: int, vector: list[float], metadata: dict):
        self._connect()
        self.client.upsert(
            collection_name=settings.QDRANT_COLLECTION,
            points=[
                models.PointStruct(
                    id=job_id,
                    vector=vector,
                    payload=metadata
                )
            ]
        )

    def search(self, vector: list[float], limit: int = 5):
        self._connect()
        return self.client.query_points(
            collection_name=settings.QDRANT_COLLECTION,
            query=vector,
            limit=limit
        ).points

    def delete_job(self, job_id: int):
        self._connect()
        self.client.delete(
            collection_name=settings.QDRANT_COLLECTION,
            points_selector=models.PointIdsList(points=[job_id])
        )

# Global singleton instance
vector_db = VectorDB()
