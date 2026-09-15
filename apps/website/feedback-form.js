const SUPABASE_URL = 'https://kumfovowvuicaldtksmc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_2XiMVlC_q74EkB0GZY9oPA_K0JzLplk';

const form = document.getElementById('feedback-form');
const status = document.getElementById('feedback-status');
const npsScale = document.querySelector('.feedback-nps-scale');
const npsInput = document.getElementById('recommend_score');

// Build the 0-10 NPS button row.
for (let i = 0; i <= 10; i++) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'feedback-nps-btn';
  btn.textContent = i;
  btn.addEventListener('click', () => {
    npsScale.querySelectorAll('.feedback-nps-btn').forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');
    npsInput.value = i;
  });
  npsScale.appendChild(btn);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!npsInput.value) {
    status.textContent = 'Please pick a number from 0 to 10 for question 5.';
    status.className = 'waitlist-message error';
    return;
  }

  const data = new FormData(form);
  const body = {
    ease_of_use: data.get('ease_of_use'),
    biggest_issue: data.get('biggest_issue')?.trim() || null,
    would_switch: data.get('would_switch'),
    fee_tolerance: data.get('fee_tolerance'),
    recommend_score: Number(data.get('recommend_score')),
  };

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  status.textContent = '';
  status.className = 'waitlist-message';

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/beta_feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      form.hidden = true;
      status.textContent = "Thanks — that's genuinely useful. We'll use this to shape what we build and charge. ";
      const waitlistLink = document.createElement('a');
      waitlistLink.href = 'index.html#waitlist';
      waitlistLink.textContent = 'Want to be first in line for full launch? Join the waitlist →';
      waitlistLink.className = 'feedback-waitlist-link';
      status.appendChild(waitlistLink);
    } else {
      throw new Error('Submission failed');
    }
  } catch {
    status.textContent = 'Something went wrong — please try again.';
    status.className = 'waitlist-message error';
    button.disabled = false;
  }
});
