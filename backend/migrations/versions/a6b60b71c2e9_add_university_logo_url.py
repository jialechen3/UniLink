"""Add local logo URL to university records.

Revision ID: a6b60b71c2e9
Revises: 44a71b20d304
Create Date: 2026-11-18
"""
from alembic import op
import sqlalchemy as sa


revision = "a6b60b71c2e9"
down_revision = "44a71b20d304"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("universities", sa.Column("logo_url", sa.String(length=255), nullable=True))


def downgrade():
    op.drop_column("universities", "logo_url")