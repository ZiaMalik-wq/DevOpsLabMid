"""Force cascade delete on students

Revision ID: 43e61ca50f58
Revises: b78f026bd610
Create Date: 2025-12-23 12:39:41.966066

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '43e61ca50f58'
down_revision: Union[str, Sequence[str], None] = 'b78f026bd610'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop old constraint
    op.execute("ALTER TABLE students DROP CONSTRAINT students_user_id_fkey")
    # Add new constraint with CASCADE
    op.execute("ALTER TABLE students ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE")

    # Do the same for Company
    op.execute("ALTER TABLE companies DROP CONSTRAINT companies_user_id_fkey")
    op.execute("ALTER TABLE companies ADD CONSTRAINT companies_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE")

def downgrade() -> None:
    # Revert to standard (No Cascade)
    op.execute("ALTER TABLE students DROP CONSTRAINT students_user_id_fkey")
    op.execute("ALTER TABLE students ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)")
    
    op.execute("ALTER TABLE companies DROP CONSTRAINT companies_user_id_fkey")
    op.execute("ALTER TABLE companies ADD CONSTRAINT companies_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)")