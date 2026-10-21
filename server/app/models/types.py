from sqlalchemy import BigInteger, Integer, Text
from sqlalchemy.dialects.mysql import MEDIUMTEXT

# SQLite는 INTEGER PRIMARY KEY만 자동 증가하므로 개발용 SQLite에서는 Integer로 바꿉니다.
BigIntPK = BigInteger().with_variant(Integer(), "sqlite")
LongText = Text().with_variant(MEDIUMTEXT(), "mysql")
