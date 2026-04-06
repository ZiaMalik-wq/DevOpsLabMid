"""Add embedding cache to students

Revision ID: e5f7a3b8c9d1
Revises: 2d173843a9f0
Create Date: 2026-01-02 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'e5f7a3b8c9d1'
down_revision: Union[str, Sequence[str], None] = '2d173843a9f0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add embedding cache fields to students table."""
    # Add embedding_cache column (stores JSON array of floats)
    op.add_column('students', sa.Column('embedding_cache', sa.Text(), nullable=True))
    
    # Add embedding_updated_at column (tracks cache freshness)
    op.add_column('students', sa.Column('embedding_updated_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Remove embedding cache fields from students table."""
    op.drop_column('students', 'embedding_updated_at')
    op.drop_column('students', 'embedding_cache')
