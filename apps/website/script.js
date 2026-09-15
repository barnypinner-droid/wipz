const SUPABASE_URL = 'https://kumfovowvuicaldtksmc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_2XiMVlC_q74EkB0GZY9oPA_K0JzLplk';

const form = document.getElementById('waitlist-form');
const emailInput = document.getElementById('waitlist-email');
const message = document.getElementById('waitlist-message');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = emailInput.value.trim();
  const button = form.querySelector('button');

  button.disabled = true;
  message.textContent = '';
  message.className = 'waitlist-message';

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/waitlist_signups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      message.textContent = "You're on the list. We'll be in touch.";
      form.reset();
    } else if (res.status === 409) {
      message.textContent = "You're already on the list!";
    } else {
      throw new Error('Signup failed');
    }
  } catch {
    message.textContent = 'Something went wrong. Please try again.';
    message.className = 'waitlist-message error';
  } finally {
    button.disabled = false;
  }
});
