"""add_unique_constraint_matches_donation_recipient

Revision ID: fcd2d2aa3693
Revises: 68d6e9553c50
Create Date: 2026-10-13 14:44:55.168724

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fcd2d2aa3693'
down_revision: Union[str, Sequence[str], None] = '68d6e9553c50'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_unique_constraint('uq_matches_donation_recipient', 'matches', ['donation_id', 'recipient_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('uq_matches_donation_recipient', 'matches', type_='unique')
