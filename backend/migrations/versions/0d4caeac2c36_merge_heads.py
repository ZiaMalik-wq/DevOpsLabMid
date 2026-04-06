"""merge_heads

Revision ID: 0d4caeac2c36
Revises: 43e61ca50f58, e5f7a3b8c9d1
Create Date: 2026-01-02 17:55:44.937046

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '0d4caeac2c36'
down_revision: Union[str, Sequence[str], None] = ('43e61ca50f58', 'e5f7a3b8c9d1')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
