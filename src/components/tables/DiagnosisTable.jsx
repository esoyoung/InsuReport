import React from 'react';
     2	import { COVERAGE_GROUPS, normalizeCoverageName } from './CoverageStatusTable';
     3	
     4	const classNames = (...classes) => classes.filter(Boolean).join(' ');
     5	
     6	const currencyFormatter = new Intl.NumberFormat('ko-KR');
     7	
     8	const STATUS_STYLES = {
     9	  부족: {
    10	    screen: 'bg-rose-100 text-rose-700 border border-rose-300',
    11	    print: 'status-badge status-부족',
    12	  },
    13	  미가입: {
    14	    screen: 'bg-gray-100 text-gray-700 border border-gray-300',
    15	    print: 'status-badge status-미가입',
    16	  },
    17	  주의: {
    18	    screen: 'bg-amber-100 text-amber-700 border border-amber-300',
    19	    print: 'status-badge status-주의',
    20	  },
    21	  충분: {
    22	    screen: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
    23	    print: 'status-badge status-충분',
    24	  },
    25	};
    26	
    27	const STATUS_ORDER = {
    28	  부족: 0,
    29	  미가입: 1,
    30	  주의: 2,
    31	  충분: 3,
    32	};
    33	
    34	const normalizeKoreanMagnitude = (value) => {
    35	  if (typeof value === 'number') return value;
    36	  if (value === null || value === undefined) return 0;
    37	
    38	  let raw = String(value).trim();
    39	  if (!raw || raw === '-' || raw === '미가입') return 0;
    40	
    41	  const isNegative = /^-/.test(raw) || /\(음수\)/.test(raw);
    42	  raw = raw.replace(/[^0-9.억만천]/g, '');
    43	  if (!raw) return 0;
    44	
    45	  raw = raw
    46	    .replace(/(\d+)\s*천만/g, (_, num) => `${Number(num) * 1000}만`)
    47	    .replace(/천만/g, '1000만')
    48	    .replace(/(\d+)\s*천/g, (_, num) => `${Number(num) * 1000}`)
    49	    .replace(/천/g, '1000');
    50	
    51	  let total = 0;
    52	
    53	  const billionMatches = [...raw.matchAll(/(\d+(?:\.\d+)?)억/g)];
    54	  billionMatches.forEach((match) => {
    55	    total += parseFloat(match[1]) * 100_000_000;
    56	  });
    57	  raw = raw.replace(/(\d+(?:\.\d+)?)억/g, '');
    58	
    59	  const tenThousandMatches = [...raw.matchAll(/(\d+(?:\.\d+)?)만/g)];
    60	  tenThousandMatches.forEach((match) => {
    61	    total += parseFloat(match[1]) * 10_000;
    62	  });
    63	  raw = raw.replace(/(\d+(?:\.\d+)?)만/g, '');
    64	
    65	  const remainingDigits = raw.replace(/[^0-9.]/g, '');
    66	  if (remainingDigits) {
    67	    total += parseFloat(remainingDigits);
    68	  }
    69	
    70	  if (!Number.isFinite(total)) {
    71	    total = 0;
    72	  }
    73	
    74	  return isNegative ? -total : total;
    75	};
    76	
    77	const formatWon = (amount, fallback = '—') => {
    78	  if (!amount) return fallback;
    79	  const rounded = Math.round(amount);
    80	  const formatted = currencyFormatter.format(Math.abs(rounded));
    81	  return `${rounded < 0 ? '-' : ''}${formatted}원`;
    82	};
    83	
    84	const renderCellContent = (content, { align = 'left', fallback = '—' } = {}) => {
    85	  const normalize = (value) => {
    86	    if (value === null || value === undefined) return '';
    87	    return String(value).trim();
    88	  };
    89	
    90	  const rawLines = Array.isArray(content)
    91	    ? content
    92	    : normalize(content)
    93	      ? [content]
    94	      : [fallback];
    95	
    96	  const normalizedLines = rawLines
    97	    .flatMap((line) => (line === null || line === undefined ? fallback : String(line).split('\n')))
    98	    .map((line) => normalize(line))
    99	    .filter((line) => line !== '');
   100	
   101	  const effectiveLines = normalizedLines.length > 0 ? normalizedLines.slice(0, 2) : [fallback];
   102	  const hasMultiline = effectiveLines.length > 1;
   103	
   104	  return (
   105	    <div
   106	      className={classNames(
   107	        'cell-content',
   108	        hasMultiline ? 'multiline' : 'single-line',
   109	        align === 'center' && 'center',
   110	        align === 'right' && 'right'
   111	      )}
   112	    >
   113	      {effectiveLines.map((line, index) => (
   114	        <span key={index}>{line}</span>
   115	      ))}
   116	    </div>
   117	  );
   118	};
   119	
   120	const enrichDiagnosis = (
   121	  item = {},
   122	  { name, fallbackStatus = null, isPlaceholder = false } = {}
   123	) => {
   124	  const label = name ?? item.담보명 ?? '';
   125	  const recommended = normalizeKoreanMagnitude(item.권장금액);
   126	  const insured = normalizeKoreanMagnitude(item.가입금액);
   127	  const rawShortfall = normalizeKoreanMagnitude(item.부족금액);
   128	  const calculatedShortfall = Math.max(0, recommended - insured);
   129	  const shortfall = rawShortfall !== 0 ? rawShortfall : calculatedShortfall;
   130	  const ratio = recommended > 0 ? Math.max(0, insured / recommended) : insured > 0 ? 1 : 0;
   131	
   132	  let status = item.상태;
   133	  if (!status || typeof status !== 'string' || status.trim() === '') {
   134	    if (fallbackStatus !== null) {
   135	      status = fallbackStatus;
   136	    } else if (recommended === 0 && insured === 0) {
   137	      status = '미가입';
   138	    } else if (ratio >= 1) {
   139	      status = '충분';
   140	    } else if (ratio >= 0.7) {
   141	      status = '주의';
   142	    } else {
   143	      status = '부족';
   144	    }
   145	  }
   146	
   147	  return {
   148	    ...item,
   149	    담보명: label,
   150	    권장금액값: recommended,
   151	    가입금액값: insured,
   152	    부족금액값: shortfall,
   153	    ratio,
   154	    상태: status,
   155	    placeholder: isPlaceholder,
   156	  };
   157	};
   158	
   159	export default function DiagnosisTable({ data }) {
   160	  const insuranceData = data || {};
   161	  const diagnosisList = insuranceData.진단현황 || [];
   162	
   163	  if (!insuranceData.고객정보 && diagnosisList.length === 0) {
   164	    return (
   165	      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
   166	        <h2 className="text-xl font-semibold mb-4 text-primary-700">담보별 진단현황</h2>
   167	        <p className="text-gray-500">데이터를 불러오는 중입니다...</p>
   168	      </div>
   169	    );
   170	  }
   171	
   172	  // AI 추출 데이터의 담보명을 정규화하여 매핑
   173	  const enrichedFromData = diagnosisList.map((item) => {
   174	    const originalName = item.담보명 || item.진단명 || '';
   175	    const normalizedName = normalizeCoverageName(originalName);
   176	    return enrichDiagnosis({
   177	      ...item,
   178	      담보명: normalizedName,
   179	      원본담보명: originalName
   180	    });
   181	  });
   182	  
   183	  const statusCounts = enrichedFromData.reduce(
   184	    (acc, item) => {
   185	      const key = item.상태 || '미가입';
   186	      acc[key] = (acc[key] || 0) + 1;
   187	      return acc;
   188	    },
   189	    { 부족: 0, 미가입: 0, 주의: 0, 충분: 0 }
   190	  );
   191	  const totalShortfall = enrichedFromData.reduce(
   192	    (sum, item) => sum + Math.max(item.부족금액값 || 0, 0),
   193	    0
   194	  );
   195	
   196	  const templateNames = COVERAGE_GROUPS.flatMap((group) => group.items);
   197	  const templateNameSet = new Set(templateNames);
   198	  const enrichedMap = new Map(enrichedFromData.map((item) => [item.담보명, item]));
   199	
   200	  const templateRows = templateNames.map((name) => {
   201	    if (enrichedMap.has(name)) {
   202	      return enrichedMap.get(name);
   203	    }
   204	    return enrichDiagnosis(
   205	      { 담보명: name, 권장금액: null, 가입금액: null, 부족금액: null },
   206	      { name, fallbackStatus: '미가입', isPlaceholder: true }
   207	    );
   208	  });
   209	
   210	  const templateRowMap = new Map(templateRows.map((item) => [item.담보명, item]));
   211	
   212	  const additionalRows = enrichedFromData.filter((item) => !templateNameSet.has(item.담보명));
   213	
   214	  const getStatusStyle = (status) => STATUS_STYLES[status] || STATUS_STYLES['미가입'];
   215	
   216	  const summaryCards = [
   217	    {
   218	      label: '부족담보',
   219	      value: `${statusCounts['부족'] || 0}건`,
   220	      tone: 'text-rose-600',
   221	      border: 'border-rose-200',
   222	      background: 'bg-rose-50',
   223	    },
   224	    {
   225	      label: '미가입담보',
   226	      value: `${statusCounts['미가입'] || 0}건`,
   227	      tone: 'text-gray-700',
   228	      border: 'border-gray-200',
   229	      background: 'bg-gray-50',
   230	    },
   231	  ];
   232	
   233	  return (
   234	    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
   235	      <div className="md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,320px)] md:gap-6">
   236	        <div className="flex flex-col gap-2">
   237	          <h2 className="text-2xl font-semibold text-gray-900">담보별 진단현황</h2>
   238	          <p className="text-xs text-gray-500 mt-1">
   239	            권장 금액 대비 현재 가입 현황을 비교하여 부족/미가입 담보를 확인할 수 있습니다.
   240	          </p>
   241	        </div>
   242	        <div className="mt-4 md:mt-0 md:self-end">
   243	          <div className="grid grid-cols-2 gap-4">
   244	            {summaryCards.map((card) => (
   245	              <div
   246	                key={card.label}
   247	                className={classNames(
   248	                  'rounded-lg border px-2 py-1 text-center',
   249	                  card.tone,
   250	                  card.border,
   251	                  card.background
   252	                )}
   253	              >
   254	                <p className="diagnosis-card-label">{card.label}</p>
   255	                <p className="diagnosis-card-value">{card.value}</p>
   256	              </div>
   257	            ))}
   258	          </div>
   259	        </div>
   260	      </div>
   261	
   262	      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
   263	        <table className="report-table divide-y divide-gray-200 text-xs" style={{ fontSize: '0.7rem', lineHeight: '1.2' }}>
   264	          <thead className="bg-teal-50">
   265	            <tr>
   266	              <th scope="col" className="px-1 py-1 text-left text-primary-700 font-semibold" style={{ fontSize: '0.7rem' }}>담보 항목</th>
   267	              <th scope="col" className="px-1 py-1 text-right text-primary-700 font-semibold" style={{ fontSize: '0.7rem', width: '5rem' }}>권장금액</th>
   268	              <th scope="col" className="px-1 py-1 text-right text-primary-700 font-semibold" style={{ fontSize: '0.7rem', width: '5rem' }}>가입금액</th>
   269	              <th scope="col" className="px-1 py-1 text-right text-primary-700 font-semibold" style={{ fontSize: '0.7rem', width: '5rem' }}>부족금액</th>
   270	              <th scope="col" className="px-1 py-1 text-center text-primary-700 font-semibold" style={{ fontSize: '0.7rem', width: '4.5rem' }}>상태</th>
   271	            </tr>
   272	          </thead>
   273	          <tbody className="divide-y divide-gray-100">
   274	            {COVERAGE_GROUPS.map((group) => (
   275	              <React.Fragment key={group.title}>
   276	                <tr className="bg-gray-50/80">
   277	                  <td colSpan={5} className="px-1 py-0.5 font-semibold text-gray-700" style={{ fontSize: '0.7rem' }}>
   278	                    {group.title}
   279	                  </td>
   280	                </tr>
   281	                {group.items.map((name) => {
   282	                  const row = templateRowMap.get(name) || enrichDiagnosis(
   283	                    { 담보명: name, 권장금액: null, 가입금액: null, 부족금액: null },
   284	                    { name, fallbackStatus: '미가입', isPlaceholder: true }
   285	                  );
   286	                  const statusStyle = getStatusStyle(row.상태);
   287	                  const recommendedDisplay = row.권장금액값 > 0 ? formatWon(row.권장금액값) : '—';
   288	                  const insuredDisplay = row.가입금액값 > 0
   289	                    ? formatWon(row.가입금액값)
   290	                    : row.상태 === '미가입'
   291	                      ? '미가입'
   292	                      : '—';
   293	                  const shortfallDisplay = row.부족금액값 > 0 ? formatWon(row.부족금액값) : '';
   294	                  const hasShortfall = row.부족금액값 > 0;
   295	
   296	                  return (
   297	                    <tr key={`${group.title}-${name}`} className="align-top" style={{ fontSize: '0.7rem', lineHeight: '1.2' }}>
   298	                      <td className="px-1 py-0.5 text-gray-900">
   299	                        {renderCellContent(name)}
   300	                      </td>
   301	                      <td className="px-1 py-0.5 text-gray-700">
   302	                        {renderCellContent(recommendedDisplay, { align: 'right' })}
   303	                      </td>
   304	                      <td className="px-1 py-0.5 text-gray-700">
   305	                        {renderCellContent(insuredDisplay, { align: 'right' })}
   306	                      </td>
   307	                      <td className={classNames('px-1 py-0.5', hasShortfall ? 'text-red-600 font-bold' : 'text-gray-700')}>
   308	                        {hasShortfall ? renderCellContent(shortfallDisplay, { align: 'right' }) : renderCellContent('', { align: 'right', fallback: '' })}
   309	                      </td>
   310	                      <td className="px-1 py-0.5 text-center">
   311	                        <span className={classNames(
   312	                          'inline-flex items-center justify-center rounded-full px-2.5 py-0.5 font-semibold whitespace-nowrap',
   313	                          statusStyle.screen,
   314	                          statusStyle.print
   315	                        )}
   316	                        style={{ fontSize: '0.65rem', minWidth: '3.5rem' }}
   317	                        >
   318	                          {row.상태}
   319	                        </span>
   320	                      </td>
   321	                    </tr>
   322	                  );
   323	                })}
   324	              </React.Fragment>
   325	            ))}
   326	            {additionalRows.length > 0 && (
   327	              <>
   328	                <tr className="bg-gray-50/80">
   329	                  <td colSpan={5} className="px-1 py-0.5 font-semibold text-gray-700" style={{ fontSize: '0.7rem' }}>추가 담보</td>
   330	                </tr>
   331	                {additionalRows
   332	                  .sort((a, b) => {
   333	                    const statusDiff = (STATUS_ORDER[a.상태] ?? 99) - (STATUS_ORDER[b.상태] ?? 99);
   334	                    if (statusDiff !== 0) return statusDiff;
   335	                    return (b.권장금액값 || 0) - (a.권장금액값 || 0);
   336	                  })
   337	                  .map((row) => {
   338	                    const statusStyle = getStatusStyle(row.상태);
   339	                    const recommendedDisplay = row.권장금액값 > 0 ? formatWon(row.권장금액값) : '—';
   340	                    const insuredDisplay = row.가입금액값 > 0
   341	                      ? formatWon(row.가입금액값)
   342	                      : row.상태 === '미가입'
   343	                        ? '미가입'
   344	                        : '—';
   345	                    const shortfallDisplay = row.부족금액값 > 0 ? formatWon(row.부족금액값) : '';
   346	                    const hasShortfall = row.부족금액값 > 0;
   347	
   348	                    return (
   349	                      <tr key={`additional-${row.담보명}`} className="align-top" style={{ fontSize: '0.7rem', lineHeight: '1.2' }}>
   350	                        <td className="px-1 py-0.5 text-gray-900">
   351	                          {renderCellContent(row.담보명)}
   352	                        </td>
   353	                        <td className="px-1 py-0.5 text-gray-700">
   354	                          {renderCellContent(recommendedDisplay, { align: 'right' })}
   355	                        </td>
   356	                        <td className="px-1 py-0.5 text-gray-700">
   357	                          {renderCellContent(insuredDisplay, { align: 'right' })}
   358	                        </td>
   359	                        <td className={classNames('px-1 py-0.5', hasShortfall ? 'text-red-600 font-bold' : 'text-gray-700')}>
   360	                          {hasShortfall ? renderCellContent(shortfallDisplay, { align: 'right' }) : renderCellContent('', { align: 'right', fallback: '' })}
   361	                        </td>
   362	                        <td className="px-1 py-0.5 text-center">
   363	                          <span className={classNames(
   364	                            'inline-flex items-center justify-center rounded-full px-2.5 py-0.5 font-semibold whitespace-nowrap',
   365	                            statusStyle.screen,
   366	                            statusStyle.print
   367	                          )}
   368	                          style={{ fontSize: '0.65rem', minWidth: '3.5rem' }}
   369	                          >
   370	                            {row.상태}
   371	                          </span>
   372	                        </td>
   373	                      </tr>
   374	                    );
   375	                  })}
   376	              </>
   377	            )}
   378	          </tbody>
   379	        </table>
   380	      </div>
   381	
   382	      <div className="mt-3 space-y-1 text-xs text-gray-500">
   383	        <p>※ 부족금액은 권장 보장금액에서 현재 가입금액을 차감한 값이며, 음수는 초과 보장을 의미합니다.</p>
   384	        <p>※ 상태 분류 기준: 70% 미만 부족, 70~99% 주의, 100% 이상 충분, 미가입은 보장 부재를 의미합니다.</p>
   385	      </div>
   386	    </div>
   387	  );
   388	}
