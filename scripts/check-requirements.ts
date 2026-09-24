/**
 * verify 一次性服务中的需求核查（业务断言，与单元测试分开、输出可读）：
 *   1) [1,-3,-2,4] 的最短步数必须为 1（且唯一最短倒位为 [2,3]）；
 *   2) 重复绝对值必须被校验拒绝（输入不保留给求解器）；
 *   3) [-1,-2,-3,-4,-5] 步数为 5、精确总数 140、规范轨迹为五个单点倒位，
 *      且深度×区间矩阵每层计数之和恒为 140（同长路径在中间排列汇合）。
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

// 3) 五个负号标记：大量同长修复路径在中间排列汇合
{
  const values = [-1, -2, -3, -4, -5];
  const { tokens, errors } = validatePermutation(values.join(','));
  check('[-1,-2,-3,-4,-5] 通过输入校验', tokens !== undefined && errors.length === 0);
  if (tokens) {
    const r = solve(tokens);
    check('五负号标记最短步数为 5', r.distance === 5, `实际为 ${r.distance}`);
    check('五负号标记精确最短方案总数为 140', r.totalPaths === 140n, `实际为 ${r.totalPaths}`);
    check(
      '五负号标记规范轨迹为五个单点倒位',
      r.canonical.steps.length === 5 &&
        r.canonical.steps.every((s, k) => s.start === k + 1 && s.end === k + 1),
      `规范步骤 ${JSON.stringify(r.canonical.steps)}`,
    );
    let rowConservation = true;
    const detail: string[] = [];
    if (r.matrix.length !== 5) {
      rowConservation = false;
      detail.push(`矩阵层数 ${r.matrix.length} ≠ 5`);
    }
    for (const layer of r.matrix) {
      let sum = 0n;
      for (const cell of layer.intervals) sum += cell.pathCount;
      if (sum !== 140n) {
        rowConservation = false;
        detail.push(`深度 ${layer.depth} 行和 ${sum}`);
      }
    }
    check('五负号标记矩阵每层区间计数之和均为 140', rowConservation, detail.join('；'));

    // presence 标注必须与精确计数一致：140=all、0=none、其余=some
    let presenceOk = true;
    for (const layer of r.matrix) {
      for (const cell of layer.intervals) {
        const expected = cell.pathCount === 140n ? 'all' : cell.pathCount === 0n ? 'none' : 'some';
        if (cell.presence !== expected) presenceOk = false;
      }
    }
    check('五负号标记矩阵 全部/部分/未出现 标注与计数一致', presenceOk);
  }
}

// 4) 已排序排列：距离 0、方案 1、矩阵为空
{
  const tokens = [1, 2, 3].map(encodeToken);
  const r = solve(tokens);
  check(
    '已排序排列距离 0、方案数 1、矩阵为空',
    r.distance === 0 && r.totalPaths === 1n && r.matrix.length === 0,
  );
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
