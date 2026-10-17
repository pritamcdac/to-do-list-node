const $ = (s) => document.querySelector(s);
const list = $('#todo-list');
let todos = [];
let filter = 'all';

$('#date').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

const api = (url, method = 'GET', body) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) })
    .then((r) => (r.status === 204 ? null : r.json()));

function render() {
  const visible = todos.filter((t) => filter === 'all' || (filter === 'done' ? t.done : !t.done));
  list.innerHTML = '';
  visible.forEach((t) => {
    const li = document.createElement('li');
    li.className = 'todo' + (t.done ? ' done' : '');
    li.innerHTML = `<button class="check" aria-label="Toggle">${t.done ? '✓' : ''}</button>
      <span class="text"></span><button class="delete" aria-label="Delete">✕</button>`;
    li.querySelector('.text').textContent = t.text;
    li.querySelector('.check').onclick = () => toggle(t);
    li.querySelector('.delete').onclick = () => remove(t, li);
    list.appendChild(li);
  });
  $('#empty').style.display = visible.length ? 'none' : 'block';
  const left = todos.filter((t) => !t.done).length;
  $('#count').textContent = `${left} task${left === 1 ? '' : 's'} left`;
}

async function toggle(t) {
  Object.assign(t, await api(`/api/todos/${t.id}`, 'PATCH', { done: !t.done }));
  render();
}

async function remove(t, li) {
  li.classList.add('removing');
  await api(`/api/todos/${t.id}`, 'DELETE');
  setTimeout(() => { todos = todos.filter((x) => x.id !== t.id); render(); }, 250);
}

$('#todo-form').onsubmit = async (e) => {
  e.preventDefault();
  const input = $('#todo-input');
  const text = input.value.trim();
  if (!text) return;
  todos.push(await api('/api/todos', 'POST', { text }));
  input.value = '';
  render();
};

document.querySelectorAll('.filter').forEach((btn) => {
  btn.onclick = () => {
    document.querySelector('.filter.active').classList.remove('active');
    btn.classList.add('active');
    filter = btn.dataset.filter;
    render();
  };
});

$('#clear-done').onclick = async () => {
  await Promise.all(todos.filter((t) => t.done).map((t) => api(`/api/todos/${t.id}`, 'DELETE')));
  todos = todos.filter((t) => !t.done);
  render();
};

api('/api/todos').then((data) => { todos = data; render(); });
