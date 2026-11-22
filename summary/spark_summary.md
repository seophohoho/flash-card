# Spark 핵심 요약 (기본 구조 · RDD · DataFrame · Spark SQL)

원문 3개(9·10·11강)를 합친 요약본. 이것만 읽어도 전체 흐름을 잡을 수 있게 구성했다.

---

## 1. 왜 Spark인가

### 탄생 배경
- 2009년 UC Berkeley AMP Lab에서 개발 시작 → 2010년 오픈소스 → 2014년 Apache 프로젝트.
- 기존 하둡 맵리듀스(Hadoop MapReduce) — 큰 데이터를 쪼개 여러 서버에서 처리하는 하둡의 계산 방식. 느리고 반복 작업에 비효율적이었다.
- 그래서 반복·실시간성이 필요한 머신러닝, 스트리밍 분석에 맞지 않았다.
- 맵리듀스 시대에는 용도별 전용 시스템(Giraph, Storm, Impala, Mahout 등)이 난립했다. Spark는 이를 하나로 통합한 범용 엔진(General Unified Engine)이다.

### 하둡의 한계 = 디스크 기반 처리
- 이전 기술은 처리 중간 결과를 디스크(disk)에 읽고 썼다.
- 디스크는 메모리(RAM)보다 훨씬 느려서 속도 저하의 원인이 된다.
- 결론: 디스크 I/O(입출력) 병목이 문제였고 Spark의 해법은 인메모리(In-Memory) 연산 — 중간 결과를 메모리에 두고 계산.

- 배치 처리(batch) — 모아서 일정 간격으로 처리. 스트림 처리(stream) — 실시간 이벤트를 연속 처리.

### 설계 철학 4가지
- 속도 — 메모리 기반 연산, DAG(방향 있는 작업 순서도) 스케줄링, Tungsten 코드 생성 최적화.
- 사용 편리성 — 단일 PC와 클러스터의 코드 차이 최소화. RDD → DataFrame → Dataset 계층 API. Scala·Python·Java·R 지원.
- 모듈성 — SQL, Streaming, MLlib, GraphX를 한 엔진에서 처리. Hive·Storm·Mahout 별도 통합이 필요 없다.
- 확장성 — HDFS, Cassandra, MongoDB, RDBMS, S3 연동. csv·parquet 등 여러 포맷 지원.

### 주요 컴포넌트
모두 Spark Core(실행 엔진) 위에서 돌며 스케줄러를 공유한다.
- Spark SQL — 구조적 데이터 처리, SQL 쿼리.
- Spark Streaming — 실시간 분석(마이크로 배치 방식).
- MLlib — 머신러닝(분류, 회귀, 군집).
- GraphX — 그래프 처리(PageRank 등).
- 클러스터 매니저: Standalone, YARN, Mesos.

### 사용하는 이유
- 반복 연산에서 맵리듀스보다 빠르다.
- 메모리 기반이라 빠르다.
- 하둡과 유연하게 연동된다.
- 장애가 나면 RDD의 계보를 다시 실행해 자동 복구한다. 계보(lineage) — 이 데이터가 어떤 변환을 거쳐 만들어졌는지의 기록.

### 주의점
- 엄밀한 실시간 처리는 불가. 이유는 기반이 되는 마이크로 배치(micro-batch) — 아주 짧은 간격으로 잘게 나눈 배치.
- 작은 파일 처리에 비효율적이다.
- 자체 파일 관리 시스템이 없어서 HDFS, S3 등을 따로 써야 한다.
- 메모리 비용이 높다.

---

## 2. 실행 구조

### 전체 그림
Driver, Cluster Manager, Worker Node로 이루어진 분산 처리 시스템이다. Worker 안에서 Executor가 일한다.

### 구성 요소
| 요소 | 역할 |
| --- | --- |
| 드라이버(Driver) — 앱 전체를 지휘하는 총감독 | 앱 실행을 관장·모니터링. 클러스터 매니저에 CPU·메모리 요청. 로직을 Stage와 Task로 분할. Executor에 Task 전달. 결과 수집. 앱당 1개만 존재 |
| 클러스터 매니저(Cluster Manager) — 서버 자원 배분 담당 | 드라이버가 요청한 Executor 프로세스 시작·중지·재시작. Executor가 쓸 최대 CPU 코어 수 제한. 종류: Standalone, Hadoop YARN, Kubernetes |
| 실행기(Executor) — 실제 일꾼 | 드라이버가 준 Task를 실행하고 결과를 드라이버에 반환. JVM 프로세스. 여러 태스크 슬롯(스레드)에서 병렬 실행 |
| 스파크 세션(SparkSession) | DataFrame·SQL 등 Spark 기능을 쓰기 위한 진입점(entry point) |

### 드라이버 실행 모드
- 클러스터 모드 — 클러스터 매니저가 Driver를 클러스터 안에서 실행. 클라이언트 모드 — `spark-submit`을 실행한 프로세스에서 실행.

### SparkSession
- API로 프로그래밍할 수 있게 해주는 객체. 내부에 SparkContext, SQLContext를 품는다.
- `spark-shell`에서는 기본 제공되지만 앱에서는 직접 만들어야 한다.

```python
from pyspark.sql import SparkSession
spark = SparkSession.builder.appName("App").getOrCreate()
spark.stop()
```

- PySpark 경로: Python → Py4J(파이썬↔JVM 연결 다리) → JVM Driver → Cluster Manager → Executors.

### Job → Stage → Task
계산을 나누는 3단계 단위다.

| 단위 | 정의 | 나뉘는 기준 |
| --- | --- | --- |
| 잡(Job) | Action(`collect()`, `count()`, `save()`) 하나가 만드는 병렬 연산 | Action 1회 = Job 1개 |
| 스테이지(Stage) | Job을 셔플(shuffle) — 서버 간 데이터 이동 — 경계로 나눈 의존성 있는 Task 묶음 | Wide 변환(셔플) |
| 태스크(Task) | Stage를 이루는 실제 실행 최소 단위. 슬롯 1개가 파티션 1개를 처리 | 파티션 수 (10개 파티션 = Task 10개) |

- 파티션(partition) — 큰 데이터를 쪼갠 조각 하나.
- Stage 안에서는 Narrow 변환이 이어지고 Stage 사이에서는 셔플이 일어난다.

---

## 3. 연산 종류

Spark 연산은 Transformation과 Action 두 종류다.

### Transformation (변환)
- 불변성 때문에 원본을 바꾸지 않고 새 RDD/DataFrame을 만든다. 불변성(immutable) — 한 번 만들면 못 고치는 성질.
- 입력과 출력이 같은 계열이다. (RDD → RDD, DataFrame → DataFrame)
- 예: `map`, `filter`, `flatMap`, `select`, `groupBy`, `orderBy`.

### Action (실행)
- 결과를 계산하거나 저장하는 연산. 이때 비로소 실제 계산이 일어난다.
- `count()` → 요소 개수(int). `collect()` → Driver로 모아 Python list로 반환. save 계열 → 외부 저장소에 기록.
- 데이터 조회도 Action이다. 외부 상태 변경이 필수는 아니다.

### Narrow vs Wide
| 구분 | Narrow 변환 | Wide 변환 |
| --- | --- | --- |
| 데이터 이동 | 셔플 없음. 부모 파티션 1개가 자식 파티션 1개에 대응 | 파티션끼리 데이터 교환(셔플) 발생 |
| 예 | `map`, `filter`, `union`, `coalesce(shuffle=False)` | `groupBy`, `orderBy`, `sortByKey`, `reduceByKey` |
| 비고 | 같은 Stage 안에서 이어서 처리 | Stage 경계가 됨 |

- `join`은 두 입력이 같은 방식으로 파티셔닝(co-partitioned)돼 있으면 narrow, 아니면 wide다.
- 셔플은 네트워크와 디스크를 쓰므로 비싸다. 셔플 수를 읽는 것이 성능 분석의 출발점이다.

### 지연 평가 (Lazy Evaluation)
- 지연 평가 — 변환을 즉시 계산하지 않고 계보(lineage)에 적어만 두다가 Action이 올 때 한꺼번에 실행하는 방식.
- 장점 1: 전체 변환 흐름을 보고 실행 계획을 최적화할 수 있다.
- 장점 2: 장애 시 기록된 lineage를 재실행해 원래 상태를 재생성하므로 데이터 내구성(durability)이 생긴다.

- 예: `map`, `filter`을 이어 써도 `collect()`를 호출하기 전까지 아무것도 실행되지 않는다.

---

## 4. RDD

### 정의
- RDD(Resilient Distributed Dataset) — 탄력적 분산 데이터셋. 대용량 데이터를 분산 처리하는 Spark의 기본 데이터 단위.
- Resilient(탄력적) = 장애 복구가 가능. Distributed(분산) = 파티션으로 나뉘어 여러 노드에 저장.
- 한계: 값은 표현하지만 스키마(컬럼 이름·타입 정보)를 표현할 방법이 없다.

### 특징
- 불변성(Immutable) — 한 번 만들면 못 바꾼다. 변환하면 새 RDD가 생긴다.
- 탄력성(Resilient) — 노드가 죽어도 lineage로 복구한다.
- 타입 안정성(Type safety) — 한 타입의 객체를 담고 컴파일 시점에 타입을 검사한다. 단 PySpark는 Python이 동적 타입 언어라 적용되지 않는다.
- 지연 평가 — 변환은 기록만 하고 Action이 필요한 파티션만 계산한다.
- 정형·비정형 모두 가능 — 비정형 텍스트는 `sc.textFile()` 후 `map/filter/flatMap`, 정형은 DataFrame 또는 `RDD.map()`.

### 생성법
```python
wordsRDD = sc.parallelize(["fish", "cats", "dogs"])
linesRDD = sc.textFile("/path/to/README.md")
rdd = df.rdd
```

- `parallelize()` — 메모리의 리스트/컬렉션을 클러스터로 보내 RDD로 만든다. 테스트·소규모 데이터용. 클수록 비효율적이다.
- `textFile()` — 외부 파일(CSV, 로그), S3, HBase/Cassandra 등에서 읽어 RDD로 만든다. 실무 기본 경로다.
- `df.rdd` — DataFrame을 RDD로 변환한다.

### Transformation 함수 표
| 함수 | 동작 | 셔플 | 대표 코드 |
| --- | --- | --- | --- |
| `map(f)` | 각 요소에 f를 적용(개수 유지) | 없음 | `x.map(lambda z: (z,1))` |
| `flatMap(f)` | f 적용 후 결과를 평탄화(flatten) — 안쪽 리스트를 펴서 한 줄로 만듦 | 없음 | `x.flatMap(lambda x: (x, 2*x))` |
| `filter(f)` | 조건이 True인 요소만 유지. 빈 파티션도 유지됨 | 없음 | `x.filter(lambda x: x%2==1)` |
| `mapPartitions(f)` | 파티션 단위로 iterator에 f 적용 | 없음 | `x.mapPartitions(f)` |
| `mapPartitionsWithIndex(f)` | 파티션 번호까지 받아 적용 | 없음 | |
| `keyBy(f)` | f로 키를 만들어 (key, value) Pair RDD 생성 | 없음 | `x.keyBy(lambda w: w[0])` |
| `groupBy(f)` | f 결과를 키로 같은 키 항목을 모음 | 발생 | `x.groupBy(lambda w: w[0])` |
| `groupByKey()` | Pair RDD에서 키별 값 목록 생성 | 발생 | `y.groupByKey()` |
| `reduceByKey(f)` | 키별로 값을 합침(Grouping+Aggregation) | 발생 | `reduceByKey(lambda a,b: a+b)` |
| `join(other)` | 같은 키끼리 쌍 생성 | 발생(같은 partitioner면 생략 가능) | `x.join(y)` |
| `union(other)` | 두 RDD를 이어 붙임. 중복 제거 안 함 | 없음 | `x.union(y)` |
| `distinct()` | 중복 제거 | 발생 | `x.distinct()` |
| `sample(withReplacement, fraction, seed)` | 통계적 표본 추출. 첫 인자는 복원 추출 여부 | 없음 | `x.sample(False, 0.4, 42)` |
| `repartition(n)` | 파티션 수 변경·균등 재분배 | 발생 | `df.repartition(10)` |
| `coalesce(n)` | 파티션 병합으로 수 줄이기 | 기본 없음 | `x.coalesce(2)` |
| `partitionBy(n, f)` | 지정한 partitioner로 재분배 | 발생(같은 partitioner면 생략 가능) | `x.partitionBy(2, lambda key: ...)` |

- `glom()` — 파티션별 요소를 리스트로 묶어 보여준다. `mapPartitions`는 파티션마다 함수를 한 번만 호출한다(`map`은 요소마다).

### map과 filter가 이어질 때
- 파티션 `[1,2,3]`, `[4,5,6]`에 `map(x*2)` → `filter(x>6)`를 걸면 `[]`, `[8,10,12]`. 파티션 수는 유지되고 파티션끼리 값을 주고받지 않는다.

### reduceByKey vs groupByKey
```python
wordCounts = wordPairsRdd.reduceByKey(lambda cnt1, cnt2: cnt1 + cnt2)
wordCounts = wordPairsRdd.groupByKey().map(lambda pair: (pair[0], sum(pair[1])))
```

| 구분 | reduceByKey | groupByKey |
| --- | --- | --- |
| 셔플 전 | 파티션 안에서 먼저 부분 집계 | 집계 없이 원본 값 그대로 |
| 이동량 | 부분 합계만 이동 (원문 예: 6개) | 원본 값 전부 이동 (원문 예: 11개) |
| 용도 | 합계·카운트 같은 집계 | 각 키의 모든 값을 모아 후속 처리 |

- 왜 그런가: 둘 다 같은 키를 한 파티션에 모으려고 셔플하지만 reduceByKey는 보낼 데이터를 먼저 줄인다. 집계 목적이면 reduceByKey가 네트워크를 덜 쓴다.

### repartition vs coalesce
| 구분 | repartition | coalesce |
| --- | --- | --- |
| 방향 | 늘리기·줄이기 모두, 균등 재분배 | 줄이기 전용 |
| 셔플 | 발생 | 없음(`shuffle=False`, 인접 파티션을 병합). `shuffle=True`면 발생 |
| 예 | 8 → 10 | 3 → 2 (`[1],[2,3],[4,5]` → `[1],[2,3,4,5]`) |

- 왜 그런가: coalesce는 기존 파티션을 합칠 뿐이라 데이터를 새로 분배하지 않는다. 대신 크기가 고르지 않을 수 있다.

### 셔플 판단 기준
- `map/flatMap/filter`는 파티션 내부 처리(셔플 없음). 키 집계는 같은 키를 모으려 셔플. `repartition`은 셔플, `coalesce(shuffle=False)`는 셔플 없음.
- 기존 파티셔닝에 따라 이동량이 달라진다. 결과·이동을 먼저 예측하고 Spark UI(Stage 경계, Task 수, Shuffle Read/Write)로 확인한다.

### Action 표
| 연산 | 설명 | 결과 예 |
| --- | --- | --- |
| `collect()` | 모든 요소를 리스트로 Driver에 반환. 큰 데이터에는 지양 | `[1,2,3,4]` |
| `count()` | 요소 개수 | `4` |
| `reduce(f)` | 요소를 두 개씩 연속 결합해 하나로. 파티션별 집계 후 Driver에서 결합 | `10` |
| `sum()` | 합 | `10` |
| `mean()` | 평균 | `2.5` |
| `countByKey()` | 키별 등장 횟수를 map으로 Driver에 반환 | `{'J':2,'F':1,'A':1}` |

- 이 Action들은 셔플이 없다. 결과가 Driver로 전송된다.

---

## 5. DataFrame

### RDD API의 문제
- RDD의 Python 함수 내부 식은 Catalyst(최적화 엔진)가 분석하기 어려워서 컬럼 구조를 활용한 최적화가 제한된다.
- DataFrame은 스키마와 표현식을 엔진에 넘겨 추가 최적화가 가능하다.

### DataFrame 정의
- 스키마(schema)가 있는 분산 데이터 컬렉션. 행(row)과 열(column)의 표 형태다.
- 각 열의 타입과 메타데이터가 명확하다.
- 구조·포맷이 Pandas DataFrame의 영향을 많이 받았다. 분산 인메모리 테이블처럼 동작한다. 컬럼마다 이름이 붙고 스키마가 정해져 있다.
- 공식처럼 외우기: **DataFrame = RDD + schema + DSL**.
- DSL(Domain-Specific Language) — 특정 목적에 맞춘 전용 문법. 여기서는 `filter`, `select` 같은 메서드 체인을 말한다.

### 스키마와 데이터 타입
- 기본 타입: Byte, Short, Integer, Long, Float, Double, String, Boolean, Decimal.
- 정형화 타입: Binary, Timestamp, Date, Array, Map, Struct, StructField.
- 스키마 = 컬럼 이름과 연관된 데이터 타입 정의.

```python
from pyspark.sql.types import StructType, StructField, StringType, ArrayType, IntegerType

schema = StructType([
    StructField("name", StringType(), True),
    StructField("scores", ArrayType(IntegerType()), True)
])
```

- DDL 문자열로도 정의한다: `"order_id STRING, order_amount DOUBLE"`.
- 스키마를 미리 정의하면: Spark가 타입을 추측할 부담이 없고 추론용 별도 Job(파일 상당 부분 읽기)을 피하며 스키마와 안 맞는 데이터를 조기에 발견한다.

### RDD vs DataFrame
| 구분 | RDD | DataFrame |
| --- | --- | --- |
| 데이터 표현 | 값만 표현. 스키마 불가 | 컬럼·타입이 있는 구조적 데이터 |
| 최적화 | 어렵다. 직접 연산 필요 | Catalyst Optimizer가 자동 최적화 |
| 편의성 | 낮음(저수준 API) | 높음(고수준 API, SQL 사용 가능) |

### 선택 기준
| 상황 | 선택 |
| --- | --- |
| 저수준 Transformation/Action을 직접 제어, 구조 없는 스트림(미디어·텍스트), 함수형 프로그래밍이 필요, 스키마 변환이 필요 없음, DataFrame으로 안 되는 성능 최적화 | RDD |
| 고수준 추상화·도메인 API, `filter/select/agg/avg/sum`·SQL·컬럼 접근, 명시적 스키마로 컬럼·타입 확인, Catalyst 최적화와 Tungsten 코드 생성, API 일관성과 간결함 | DataFrame |

### Dataset API
- Spark 2.0에서 DataFrame과 Dataset API를 하나로 합쳤다. 한 종류만 알면 된다.
- Dataset에는 정적 타입(typed) API와 동적 타입(untyped) API의 특성이 모두 있다.
  - Untyped: `DataFrame = Dataset[Row]` (별칭, alias).
  - Typed: `Dataset[T]`.
- 타입 안전을 보장하는 Java, Scala에서만 사용할 수 있다. Python, R은 DataFrame API만 쓴다.

### DataFrame 변환
- `df.rdd` → RDD, `df.toJSON()` → JSON 문자열, `df.toPandas()` → Pandas. `toPandas()`는 Driver 메모리로 모으므로 큰 데이터에 주의한다.

---

## 6. Spark SQL

### 정의
- 구조화된 데이터를 SQL처럼 처리하게 해주는 Spark 모듈. 분산 SQL 쿼리 엔진이다.
- DataFrame/Dataset API와 같은 엔진(Catalyst)을 쓴다. RDD보다 추상화 수준이 높고 자동 최적화도 된다.
- 중심은 DataFrame이다. Spark SQL은 DataFrame에 SQL 방식으로 접근하는 방법 중 하나다.

### 역할
- SQL 질의 수행, 여러 포맷(JSON, CSV, parquet, orc) 읽기·쓰기, JDBC/ODBC로 외부 도구 연결, 최적화된 실행 코드 생성.

### Catalyst Optimizer
- 카탈리스트 옵티마이저(Catalyst Optimizer) — 쿼리를 가장 빠른 실행 방식으로 자동 재작성·선택해 주는 최적화 엔진.
- SQL, DataFrame, Dataset 모두 같은 엔진을 거친다.

최적화 4단계: (1) SQL 파싱/DataFrame 해석, (2) Logical Plan 생성(Catalog 참조), (3) Optimized Logical Plan, (4) Physical Plan(여러 후보 중 Cost Model로 선택 후 Code Generation → RDD 실행).
- `df.explain()`으로 논리·물리 실행 계획을 확인한다.

### View 등록
DataFrame을 SQL 테이블처럼 쓰려면 뷰(view)로 등록한다.

```python
df.createTempView("viewName")
df.createOrReplaceTempView("viewName")
df.createGlobalTempView("viewName")
spark.sql("SELECT * FROM viewName").show()
spark.sql("SELECT * FROM global_temp.viewName").show()
```

| 메서드 | 동작 |
| --- | --- |
| `createTempView` | 임시 뷰 생성 |
| `createOrReplaceTempView` | 같은 이름이 있으면 덮어씀 |
| `createGlobalTempView` | 전역 뷰 생성. `global_temp.` 접두어로 조회 |

### DSL과 SQL의 관계
- 완전히 별개가 아니다. 같은 Catalyst Optimizer를 공유하고 내부가 통합돼 있다.
- DataFrame API로 쓴 명령도 내부적으로 Spark SQL 엔진이 최적화해 실행한다.
- `df.filter(col("label") == 1)`과 `spark.sql("SELECT * FROM data WHERE label = 1")`은 같은 결과다. 편한 쪽을 쓰면 된다.
- 결론: 이것은 같은 쿼리 엔진에 대한 두 가지 인터페이스(interface)다.

---

## 7. DataFrame 실전

### 생성과 입출력
```python
df = spark.createDataFrame(data=data, schema=schema)

df = spark.read.format("csv").option("header", True).schema(order_schema).load("data/input/order_history.csv")

df.write.mode("overwrite").format("csv").save("data/output")
```

- 생성은 SparkSession에서 시작한다: `createDataFrame()`, `read`, `readStream`.
- 저장은 생성된 DataFrame 객체에서 한다: `write`, `writeStream`. 입력과 출력의 호출 위치가 다르다.
- 간단 읽기: `spark.read.json(...)`, `.parquet(...)`, `.text(...)`, `.csv(...)`.
- 파일을 읽을 때 `.option("inferSchema", "true")`로 타입을 추론할 수 있다.

read(`format/option/schema/load`)와 write 함수 표:
| 함수 | 역할 |
| --- | --- |
| `format()` | 형식·소스 지정(parquet(기본값), csv, json, orc, jdbc, text, kafka 등) |
| `option()` | 소스별 세부 옵션(`header`, `delimiter` 등) |
| `schema()` | 컬럼명·타입 직접 정의 (read) |
| `load()` | 실제 읽기 실행 (read) |
| `mode()` | 기존 데이터가 있을 때 처리: `overwrite` 덮어쓰기, `append` 뒤에 추가, `ignore` 있으면 저장 생략, `error` 있으면 오류 |
| `partitionBy()` / `bucketBy()` / `sortBy()` | 컬럼 값별 디렉터리 분할 / 해시 버킷 분할 / 저장 전 정렬 |
| `save()` | 저장 실행 |

배치 vs 스트리밍:
- `read` / `write` — 저장된 데이터를 한 번에 처리하는 배치 방식.
- `readStream` / `writeStream` — 계속 들어오는 데이터를 지속 처리하는 스트리밍 방식. 소스에 따라 옵션이 다르다.

### 데이터 확인
- `show()` 내용, `printSchema()`/`schema`/`dtypes` 스키마, `columns` 컬럼명, `head()`/`first()`/`take(n)` 앞쪽 행.
- `describe()` 요약 통계, `count()`, `distinct().count()`, `dropDuplicates()` 중복 제거, `explain()` 실행 계획.

### DSL ↔ SQL 대응표
SQL은 `df.createOrReplaceTempView("my_table")` 등록 후 `spark.sql("""...""")`로 실행한다.

| 작업 | DSL | SQL |
| --- | --- | --- |
| 컬럼 선택 | `df.select("column1", "column2")` | `SELECT column1, column2 FROM my_table` |
| 표현식 컬럼 | `df.select(col("column1"), (col("column2")+1).alias("column2_plus1"))` | `SELECT column1, column2 + 1 AS column2_plus1 FROM my_table` |
| 조건 필터 | `df.filter(df["column2"] > 200)` | `SELECT * FROM my_table WHERE column2 > 200` |
| 조건부 값 | `when(df.column2 > 100, 1).otherwise(0).alias("flag")` | `CASE WHEN column2 > 100 THEN 1 ELSE 0 END AS flag` |
| 목록 포함 | `df.filter(df.column1.isin("A", "B"))` | `WHERE column1 IN ('A', 'B')` |
| 문자열 시작 | `col("column1").startswith("A")` | `column1 LIKE 'A%'` |
| 문자열 끝 | `col("column2").cast("string").endswith("00")` | `CAST(column2 AS STRING) LIKE '%00'` |
| 정확히 일치 | `col("column1").like("A")` | `column1 = 'A'` |
| 부분 문자열 | `df.column1.substr(2, 3)` | `SUBSTRING(column1, 2, 3)` |
| 범위 | `col("column2").between(50, 150)` | `column2 BETWEEN 50 AND 150` |
| 컬럼명 변경 | `df.withColumnRenamed("column1", "alphabet")` | `SELECT column1 AS alphabet` |
| 컬럼 삭제 | `df.drop("column1")` | `SELECT column2 FROM my_table` (남길 컬럼만 선택) |
| 그룹 개수 | `df.groupBy("column1").count()` | `SELECT column1, COUNT(*) AS count FROM my_table GROUP BY column1` |
| 정렬(단일) | `df.sort(df["column1"].desc())` | `ORDER BY column1 DESC` |
| 정렬(다중) | `df.orderBy(["column1","column2"], ascending=[True, False])` | `ORDER BY column1 ASC, column2 DESC` |
| 결측 채우기 | `df.na.fill({"column1": "Unknown", "column2": 0})` | `COALESCE(column1, 'Unknown')` |
| 결측 행 제거 | `df.na.drop()` | `WHERE column1 IS NOT NULL AND column2 IS NOT NULL` |
| 값 치환 | `df.na.replace({"A": "Alpha", "B": "Beta"})` | `CASE WHEN column1 = 'A' THEN 'Alpha' WHEN column1 = 'B' THEN 'Beta' ELSE column1 END` |
| 조인 | `df_users.join(df_orders, df_users.user_id == df_orders.user_id, "left")` | `FROM users u LEFT JOIN orders o ON u.user_id = o.user_id` |

주의:
- 문자열 조건 함수는 문자열 비교로 True/False를 반환하므로 숫자 컬럼은 `cast("string")` 변환이 필요할 수 있다.
- `na.fill`은 NULL을 채운다. `na.replace`는 NULL이 아니라 값 자체를 바꾼다. 그래서 치환 결과에 NULL이 그대로 남는다.
- 조인 종류는 DSL에서 세 번째 인자 문자열로 지정한다: `"inner"`, `"left"`, `"right"`, `"full_outer"`.

- 조인 종류별 결과: INNER는 공통 키만, LEFT는 왼쪽 전부(없으면 오른쪽 NULL), RIGHT는 오른쪽 전부, FULL OUTER는 양쪽 전부.

### 컬럼 변환과 집계
```python
age_df = df.withColumn("Age", col("Age").cast("int"))
summary_df = age_df.groupBy("Department").agg(avg("Age").alias("Avg_Age"), count("*").alias("Employee_Count"))
date_df = age_df.withColumn("d", to_date(col("OrderDate"), "dd-MM-yyyy"))
```

- `withColumn()` — 원본을 수정하지 않고 컬럼을 추가·교체한 새 DataFrame을 반환한다.
- `cast()` — 컬럼 타입을 바꾼다.
- `groupBy().agg()` — 그룹별로 여러 집계를 한 번에 정의한다. `alias()`로 결과 컬럼 이름을 붙인다.
- `to_date()` — 문자열(StringType)을 날짜(DateType)로 변환한다. 표시 형식만 바꾸는 것이 아니다. `MM`(월)과 `mm`(분)을 구분해야 한다.
- `when().otherwise()` — 조건에 맞으면 새 값, 아니면 기존 값을 유지한다.
