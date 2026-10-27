"""make profile body fields optional

Revision ID: 405efabd7392
Revises: 1e8854dac547
Create Date: 2026-10-27 10:07:58.680634

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '405efabd7392'
down_revision: Union[str, Sequence[str], None] = '1e8854dac547'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('user_profiles', schema=None) as batch_op:
        batch_op.alter_column('gender',
               existing_type=sa.Enum('M', 'F', 'OTHER', name='gender'),
               nullable=True)
        batch_op.alter_column('birth_year',
               existing_type=sa.SMALLINT(),
               nullable=True)
        batch_op.alter_column('height_cm',
               existing_type=sa.NUMERIC(precision=5, scale=1),
               nullable=True)
        batch_op.alter_column('weight_kg',
               existing_type=sa.NUMERIC(precision=5, scale=1),
               nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    # 신체 정보가 빈 프로필은 이전 스키마에 들어가지 않으므로 지움 (온보딩에서 다시 만듦)
    op.execute(
        "DELETE FROM user_profiles WHERE gender IS NULL OR birth_year IS NULL OR height_cm IS NULL OR weight_kg IS NULL"
    )
    with op.batch_alter_table('user_profiles', schema=None) as batch_op:
        batch_op.alter_column('weight_kg',
               existing_type=sa.NUMERIC(precision=5, scale=1),
               nullable=False)
        batch_op.alter_column('height_cm',
               existing_type=sa.NUMERIC(precision=5, scale=1),
               nullable=False)
        batch_op.alter_column('birth_year',
               existing_type=sa.SMALLINT(),
               nullable=False)
        batch_op.alter_column('gender',
               existing_type=sa.Enum('M', 'F', 'OTHER', name='gender'),
               nullable=False)
