"""add competitor monitor last snapshot link

Revision ID: c7d3e5f8a2b6
Revises: b6fc2d8168dd
Create Date: 2026-10-13

补齐与交付源码一致的竞品监控"最后快照"外键列：竞品监控每次复查后把
last_snapshot_id 指向最新快照，便于列表页直接读取最近一次解析结果。
"""

from alembic import op
import sqlalchemy as sa


revision = "c7d3e5f8a2b6"
down_revision = "b6fc2d8168dd"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """添加竞品监控最后快照外键列与约束。"""
    op.add_column(
        "competitor_monitors",
        sa.Column("last_snapshot_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        op.f("fk_competitor_monitors_last_snapshot_id_competitor_monitor_snapshots"),
        "competitor_monitors",
        "competitor_monitor_snapshots",
        ["last_snapshot_id"],
        ["id"],
    )


def downgrade() -> None:
    """回滚本版本数据库迁移，按反向依赖顺序恢复上一版数据库结构。"""
    op.drop_constraint(
        op.f("fk_competitor_monitors_last_snapshot_id_competitor_monitor_snapshots"),
        "competitor_monitors",
        type_="foreignkey",
    )
    op.drop_column("competitor_monitors", "last_snapshot_id")
