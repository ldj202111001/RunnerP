"""add goal types and plan phase

Revision ID: 1e8854dac547
Revises: 5ed66309e88c
Create Date: 2026-10-27 09:54:29.080000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1e8854dac547'
down_revision: Union[str, Sequence[str], None] = '5ed66309e88c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 기존 행용 server_default: 이전 목표는 거리·기록·날짜가 모두 있었으므로 RACE, 이전 계획은 BASE
    with op.batch_alter_table('goals', schema=None) as batch_op:
        batch_op.add_column(sa.Column('type', sa.Enum('HEALTH', 'IMPROVE', 'RACE', name='goal_type'), nullable=False, server_default='RACE'))
        batch_op.add_column(sa.Column('weekly_minutes_target', sa.SmallInteger(), nullable=True))
        batch_op.alter_column('distance_km',
               existing_type=sa.NUMERIC(precision=6, scale=4),
               nullable=True)
        batch_op.alter_column('target_time_sec',
               existing_type=sa.INTEGER(),
               nullable=True)
        batch_op.alter_column('target_date',
               existing_type=sa.DATE(),
               nullable=True)

    with op.batch_alter_table('planned_sessions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('condition', sa.SmallInteger(), nullable=True))
        batch_op.add_column(sa.Column('downgraded', sa.Boolean(), nullable=False, server_default=sa.false()))

    with op.batch_alter_table('user_profiles', schema=None) as batch_op:
        batch_op.add_column(sa.Column('availability', sa.JSON(), nullable=True))

    with op.batch_alter_table('weekly_plans', schema=None) as batch_op:
        batch_op.add_column(sa.Column('phase', sa.Enum('BASE', 'BUILD', 'PEAK', 'TAPER', 'RECOVERY', 'MAINTAIN', name='plan_phase'), nullable=False, server_default='BASE'))


def downgrade() -> None:
    """Downgrade schema."""
    # HEALTH·IMPROVE 목표는 이전 스키마(거리·기록·날짜 필수)에 들어가지 않으므로 지움
    op.execute("DELETE FROM goals WHERE type <> 'RACE'")
    with op.batch_alter_table('weekly_plans', schema=None) as batch_op:
        batch_op.drop_column('phase')

    with op.batch_alter_table('user_profiles', schema=None) as batch_op:
        batch_op.drop_column('availability')

    with op.batch_alter_table('planned_sessions', schema=None) as batch_op:
        batch_op.drop_column('downgraded')
        batch_op.drop_column('condition')

    with op.batch_alter_table('goals', schema=None) as batch_op:
        batch_op.alter_column('target_date',
               existing_type=sa.DATE(),
               nullable=False)
        batch_op.alter_column('target_time_sec',
               existing_type=sa.INTEGER(),
               nullable=False)
        batch_op.alter_column('distance_km',
               existing_type=sa.NUMERIC(precision=6, scale=4),
               nullable=False)
        batch_op.drop_column('weekly_minutes_target')
        batch_op.drop_column('type')
