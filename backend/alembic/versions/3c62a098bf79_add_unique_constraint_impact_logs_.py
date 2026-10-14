"""add_unique_constraint_impact_logs_donation_id

Revision ID: 3c62a098bf79
Revises: fcd2d2aa3693
Create Date: 2026-10-13 18:05:26.484576

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3c62a098bf79'
down_revision: Union[str, Sequence[str], None] = 'fcd2d2aa3693'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_unique_constraint('uq_impact_logs_donation_id', 'impact_logs', ['donation_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('uq_impact_logs_donation_id', 'impact_logs', type_='unique')

