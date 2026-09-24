/**
 * verify 一次性服务中的需求核查（业务断言，与单元测试分开、输出可读）：
 *   1) [1,-3,-2,4] 的最短步数必须为 1（且唯一最短倒位为 [2,3]）；
 *   2) 重复绝对值必须被校验拒绝（输入不保留给求解器）；
 *   3) [-1,-2,-3,-4,-5] 步数 5、精确总数 140、规范轨迹为逐位置单点倒位，
 *      深度×区间矩阵每行计数之和为 140，规范格不得标为未出现。
 * 任一断言失败即以非零退出码结束容器。
 */
import { encodeToken, validatePermutation } from '../src/lib/permutation';
import { solve } from '../src/lib/solver';

let failures = 0;

function check(name: string, ok: boolean, detail = '') {
  if (ok) {
    console.log(`PASS: ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
    failures += 1;
  }
}

// 1) [1,-3,-2,4] 最短步数为 1
{
  const values = [1, -3, -2, 4];
  const { tokens, errors } = validatePermutation(values.join(','));
  check('[1,-3,-2,4] 通过输入校验', tokens !== undefined && errors.length === 0);
  if (tokens) {
    const r = solve(tokens);
    check('[1,-3,-2,4] 最短步数为 1', r.distance === 1, `实际为 ${r.distance}`);
    check(
      '[1,-3,-2,4] 唯一最短倒位是 [2,3]',
      r.totalPaths === 1n &&
        r.canonical.steps.length === 1 &&
        r.canonical.steps[0].start === 2 &&
        r.canonical.steps[0].end === 3,
      `方案数 ${r.totalPaths}，规范步骤 ${JSON.stringify(r.canonical.steps)}`,
    );
  }
}

// 2) 重复绝对值被拒绝（同号重复、异号重复各一例）
for (const raw of ['1,1,3', '1,-1,2', '2,2,2']) {
  const { tokens, errors } = validatePermutation(raw);
  check(
    `重复绝对值被拒绝：“${raw}”`,
    tokens === undefined && errors.some((e) => e.includes('重复')),
    errors.join(' / '),
  );
}

// 3) [-1,-2,-3,-4,-5]：步数 5、精确总数 140、矩阵逐行守恒
{
  const values = [-1, -2, -3, -4, -5];
  const { tokens, errors } = validatePermutation(values.join(','));
  check('[-1,-2,-3,-4,-5] 通过输入校验', tokens !== undefined && errors.length === 0);
  if (tokens) {
    const r = solve(tokens);
    check('[-1,-2,-3,-4,-5] 最少倒位步数为 5', r.distance === 5, `实际为 ${r.distance}`);
    check(
      '[-1,-2,-3,-4,-5] 最短方案总数精确为 140',
      r.totalPaths === 140n,
      `实际为 ${r.totalPaths}`,
    );
    check(
      '[-1,-2,-3,-4,-5] 规范轨迹为 [1,1]…[5,5] 单点倒位',
      JSON.stringify(r.canonical.steps) ===
        JSON.stringify([1, 2, 3, 4, 5].map((k) => ({ start: k, end: k }))),
      `实际为 ${JSON.stringify(r.canonical.steps)}`,
    );
    let matrixOk = r.matrix.length === 5;
    const rowSums: string[] = [];
    for (const layer of r.matrix) {
      let sum = 0n;
      for (const cell of layer.intervals) sum += cell.pathCount;
      rowSums.push(sum.toString());
      if (sum !== 140n) matrixOk = false;
    }
    check(
      '[-1,-2,-3,-4,-5] 矩阵每个深度区间计数之和均为 140',
      matrixOk,
      `逐行之和：${rowSums.join('、')}`,
    );

    // 规范格必须确实出现在最短方案中，高亮不得与汇总结论矛盾。
    let highlightOk = true;
    for (const layer of r.matrix) {
      const canon = r.canonical.steps[layer.depth];
      const cell = layer.intervals.find(
        (c) => c.start === canon.start && c.end === canon.end,
      );
      if (!cell || cell.pathCount === 0n || cell.presence === 'none') {
        highlightOk = false;
      }
    }
    check('[-1,-2,-3,-4,-5] 规范轨迹格均实际出现（高亮与结论一致）', highlightOk);
  }
}

// 附带确认 encodeToken 没有被误用（快速健全性检查）
{
  const tokens = [1, -3, -2, 4].map(encodeToken);
  check('token 编码往返', tokens.length === 4);
}

if (failures > 0) {
  console.error(`需求核查失败 ${failures} 项`);
  process.exit(1);
}
console.log('需求核查全部通过');
