// Where the public site's "Book Now" / "My Profile" buttons should send the visitor.
export function currentUser() {
  try {
    return localStorage.getItem('token') ? JSON.parse(localStorage.getItem('user') || 'null') : null;
  } catch {
    return null;
  }
}

export function bookNowPath() {
  const user = currentUser();
  if (!user) return '/login';
  return user.role === 'admin' ? '/admin' : '/customer/book';
}

export function profilePath() {
  const user = currentUser();
  if (!user) return '/login';
  return user.role === 'admin' ? '/admin' : '/customer';
}
