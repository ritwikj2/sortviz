function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let value = Math.imul(seed ^ (seed >>> 15), seed | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle(length, seed) {
  let hash = 2166136261;
  for (const character of String(seed)) {
    hash = Math.imul(hash ^ character.codePointAt(0), 16777619);
  }
  const random = mulberry32(hash);
  const a = Array.from({ length }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function* bubbleSort(a) {
  for (let end = a.length - 1; end > 0; end--) {
    let swapped = false;
    for (let i = 0; i < end; i++) {
      yield { type: 'compare', i, j: i + 1 };
      if (a[i] > a[i + 1]) {
        [a[i], a[i + 1]] = [a[i + 1], a[i]];
        yield { type: 'swap', i, j: i + 1 };
        swapped = true;
      }
    }
    if (!swapped) return;
  }
}

function* cocktailSort(a) {
  let start = 0;
  let end = a.length - 1;
  while (start < end) {
    let swapped = false;
    for (let i = start; i < end; i++) {
      yield { type: 'compare', i, j: i + 1 };
      if (a[i] > a[i + 1]) {
        [a[i], a[i + 1]] = [a[i + 1], a[i]];
        yield { type: 'swap', i, j: i + 1 };
        swapped = true;
      }
    }
    if (!swapped) return;
    end--;
    swapped = false;
    for (let i = end; i > start; i--) {
      yield { type: 'compare', i: i - 1, j: i };
      if (a[i - 1] > a[i]) {
        [a[i - 1], a[i]] = [a[i], a[i - 1]];
        yield { type: 'swap', i: i - 1, j: i };
        swapped = true;
      }
    }
    if (!swapped) return;
    start++;
  }
}

function* oddEvenSort(a) {
  let swapped = true;
  while (swapped) {
    swapped = false;
    for (let parity = 0; parity < 2; parity++) {
      for (let i = parity; i + 1 < a.length; i += 2) {
        yield { type: 'compare', i, j: i + 1 };
        if (a[i] > a[i + 1]) {
          [a[i], a[i + 1]] = [a[i + 1], a[i]];
          yield { type: 'swap', i, j: i + 1 };
          swapped = true;
        }
      }
    }
  }
}

function* gnomeSort(a) {
  let i = 1;
  while (i < a.length) {
    yield { type: 'compare', i: i - 1, j: i };
    if (a[i - 1] <= a[i]) {
      i++;
    } else {
      [a[i - 1], a[i]] = [a[i], a[i - 1]];
      yield { type: 'swap', i: i - 1, j: i };
      i = Math.max(1, i - 1);
    }
  }
}

function* insertionSort(a) {
  for (let i = 1; i < a.length; i++) {
    for (let j = i; j > 0; j--) {
      yield { type: 'compare', i: j - 1, j };
      if (a[j - 1] <= a[j]) break;
      [a[j - 1], a[j]] = [a[j], a[j - 1]];
      yield { type: 'swap', i: j - 1, j };
    }
  }
}

function* selectionSort(a) {
  for (let i = 0; i < a.length - 1; i++) {
    let minimum = i;
    for (let j = i + 1; j < a.length; j++) {
      yield { type: 'compare', i: minimum, j };
      if (a[j] < a[minimum]) minimum = j;
    }
    if (minimum !== i) {
      [a[i], a[minimum]] = [a[minimum], a[i]];
      yield { type: 'swap', i, j: minimum };
    }
  }
}

function* shellSort(a) {
  let gap = 1;
  while (gap < a.length / 3) gap = 3 * gap + 1;
  for (; gap >= 1; gap = Math.floor(gap / 3)) {
    for (let i = gap; i < a.length; i++) {
      for (let j = i; j >= gap; j -= gap) {
        yield { type: 'compare', i: j - gap, j };
        if (a[j - gap] <= a[j]) break;
        [a[j - gap], a[j]] = [a[j], a[j - gap]];
        yield { type: 'swap', i: j - gap, j };
      }
    }
  }
}

function* combSort(a) {
  let gap = a.length;
  let swapped = true;
  while (gap > 1 || swapped) {
    gap = Math.max(1, Math.floor(gap / 1.3));
    swapped = false;
    for (let i = 0; i + gap < a.length; i++) {
      const j = i + gap;
      yield { type: 'compare', i, j };
      if (a[i] > a[j]) {
        [a[i], a[j]] = [a[j], a[i]];
        yield { type: 'swap', i, j };
        swapped = true;
      }
    }
  }
}

function* heapSort(a) {
  function* siftDown(root, length) {
    while (root * 2 + 1 < length) {
      let child = root * 2 + 1;
      if (child + 1 < length) {
        yield { type: 'compare', i: child, j: child + 1 };
        if (a[child] < a[child + 1]) child++;
      }
      yield { type: 'compare', i: root, j: child };
      if (a[root] >= a[child]) return;
      [a[root], a[child]] = [a[child], a[root]];
      yield { type: 'swap', i: root, j: child };
      root = child;
    }
  }
  for (let root = Math.floor(a.length / 2) - 1; root >= 0; root--) {
    yield* siftDown(root, a.length);
  }
  for (let end = a.length - 1; end > 0; end--) {
    [a[0], a[end]] = [a[end], a[0]];
    yield { type: 'swap', i: 0, j: end };
    yield* siftDown(0, end);
  }
}

function* mergeSort(a) {
  function* merge(start, end) {
    if (end - start < 2) return;
    const middle = Math.floor((start + end) / 2);
    yield* merge(start, middle);
    yield* merge(middle, end);
    const merged = [];
    let left = start;
    let right = middle;
    while (left < middle && right < end) {
      yield { type: 'compare', i: left, j: right };
      merged.push(a[left] <= a[right] ? a[left++] : a[right++]);
    }
    while (left < middle) merged.push(a[left++]);
    while (right < end) merged.push(a[right++]);
    for (let offset = 0; offset < merged.length; offset++) {
      const i = start + offset;
      a[i] = merged[offset];
      yield { type: 'write', i, v: a[i] };
    }
  }
  yield* merge(0, a.length);
}

function* quickSort(a) {
  const stack = [[0, a.length - 1]];
  while (stack.length) {
    const [low, high] = stack.pop();
    if (low >= high) continue;
    const middle = Math.floor((low + high) / 2);
    [a[middle], a[high]] = [a[high], a[middle]];
    yield { type: 'swap', i: middle, j: high };
    let pivot = low;
    for (let i = low; i < high; i++) {
      yield { type: 'compare', i, j: high };
      if (a[i] < a[high]) {
        if (i !== pivot) {
          [a[i], a[pivot]] = [a[pivot], a[i]];
          yield { type: 'swap', i, j: pivot };
        }
        pivot++;
      }
    }
    if (pivot !== high) {
      [a[pivot], a[high]] = [a[high], a[pivot]];
      yield { type: 'swap', i: pivot, j: high };
    }
    stack.push([low, pivot - 1], [pivot + 1, high]);
  }
}

function* countingSort(a) {
  const counts = new Array(a.length).fill(0);
  for (const value of a) counts[value]++;
  let i = 0;
  for (let value = 0; value < counts.length; value++) {
    for (let count = 0; count < counts[value]; count++) {
      a[i] = value;
      yield { type: 'write', i, v: value };
      i++;
    }
  }
}

function* radixSort(a) {
  const base = 4;
  for (let place = 1; place < a.length; place *= base) {
    const offsets = new Array(base).fill(0);
    const output = new Array(a.length);
    for (const value of a) offsets[Math.floor(value / place) % base]++;
    let total = 0;
    for (let digit = 0; digit < base; digit++) {
      const count = offsets[digit];
      offsets[digit] = total;
      total += count;
    }
    for (const value of a) {
      const digit = Math.floor(value / place) % base;
      output[offsets[digit]++] = value;
    }
    for (let i = 0; i < a.length; i++) {
      a[i] = output[i];
      yield { type: 'write', i, v: a[i] };
    }
  }
}

const BOGO_CAP = 2000;

function* bogoSort(a) {
  const random = mulberry32(42);
  for (let shuffles = 0; ; shuffles++) {
    let sorted = true;
    for (let i = 1; i < a.length; i++) {
      yield { type: 'compare', i: i - 1, j: i };
      if (a[i - 1] > a[i]) {
        sorted = false;
        break;
      }
    }
    if (sorted) return;
    if (shuffles === BOGO_CAP) return { gaveUp: true };
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      if (j !== i) {
        [a[i], a[j]] = [a[j], a[i]];
        yield { type: 'swap', i, j };
      }
    }
  }
}

export const ALGORITHMS = [
  { id: 'bubble', name: 'Bubble sort', complexity: 'O(n²)', run: bubbleSort, enabledByDefault: true },
  { id: 'cocktail', name: 'Cocktail shaker sort', complexity: 'O(n²)', run: cocktailSort, enabledByDefault: true },
  { id: 'odd-even', name: 'Odd–even sort', complexity: 'O(n²)', run: oddEvenSort, enabledByDefault: true },
  { id: 'gnome', name: 'Gnome sort', complexity: 'O(n²)', run: gnomeSort, enabledByDefault: true },
  { id: 'insertion', name: 'Insertion sort', complexity: 'O(n²)', run: insertionSort, enabledByDefault: true },
  { id: 'selection', name: 'Selection sort', complexity: 'O(n²)', run: selectionSort, enabledByDefault: true },
  { id: 'shell', name: 'Shell sort', complexity: 'O(n²)', run: shellSort, enabledByDefault: true },
  { id: 'comb', name: 'Comb sort', complexity: 'O(n²)', run: combSort, enabledByDefault: true },
  { id: 'heap', name: 'Heap sort', complexity: 'O(n log n)', run: heapSort, enabledByDefault: true },
  { id: 'merge', name: 'Merge sort', complexity: 'O(n log n)', run: mergeSort, enabledByDefault: true },
  { id: 'quick', name: 'Quick sort', complexity: 'O(n²)', run: quickSort, enabledByDefault: true },
  { id: 'counting', name: 'Counting sort', complexity: 'O(n + k)', run: countingSort, enabledByDefault: true },
  { id: 'radix', name: 'Radix sort · base 4', complexity: 'O(d(n + 4))', run: radixSort, enabledByDefault: true },
  { id: 'bogo', name: 'Bogo sort', complexity: `${BOGO_CAP.toLocaleString('en-US')} shuffle cap`, run: bogoSort, enabledByDefault: false },
];
