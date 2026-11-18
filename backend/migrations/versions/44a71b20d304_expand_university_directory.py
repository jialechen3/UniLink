"""Expand university directory metadata.

Revision ID: 44a71b20d304
Revises: 1fe7be7fce73
Create Date: 2026-11-18
"""
from alembic import op
import sqlalchemy as sa


revision = "44a71b20d304"
down_revision = "1fe7be7fce73"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("universities") as batch_op:
        batch_op.add_column(sa.Column("short_name", sa.String(length=80), nullable=True))
        batch_op.add_column(sa.Column("city", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("state", sa.String(length=2), nullable=True))
        batch_op.add_column(sa.Column("brand_color", sa.String(length=7), nullable=True))
        batch_op.add_column(sa.Column("initials", sa.String(length=16), nullable=True))

    op.execute(sa.text("""
        UPDATE universities
        SET short_name = 'UB', city = 'Buffalo', state = 'NY', brand_color = '#005BBB', initials = 'UB'
        WHERE slug = 'university-at-buffalo'
    """))
    op.execute(sa.text("""
        UPDATE universities
        SET short_name = 'Brooklyn', city = 'Brooklyn', state = 'NY', brand_color = '#7A0019', initials = 'BC'
        WHERE slug = 'brooklyn-college'
    """))

    with op.batch_alter_table("universities") as batch_op:
        batch_op.alter_column("short_name", existing_type=sa.String(length=80), nullable=False)
        batch_op.alter_column("city", existing_type=sa.String(length=100), nullable=False)
        batch_op.alter_column("state", existing_type=sa.String(length=2), nullable=False)
        batch_op.alter_column("brand_color", existing_type=sa.String(length=7), nullable=False)
        batch_op.alter_column("initials", existing_type=sa.String(length=16), nullable=False)


def downgrade():
    with op.batch_alter_table("universities") as batch_op:
        batch_op.drop_column("initials")
        batch_op.drop_column("brand_color")
        batch_op.drop_column("state")
        batch_op.drop_column("city")
        batch_op.drop_column("short_name")