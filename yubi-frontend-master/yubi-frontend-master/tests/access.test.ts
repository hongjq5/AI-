import access from '../src/access';

test('grants admin UI access using the backend userRole field', () => {
  expect(access({ currentUser: { id: 1, userRole: 'admin' } }).canAdmin).toBe(true);
});

test.each([undefined, {}, { currentUser: { id: 2, userRole: 'user' } }])(
  'does not grant admin UI access without an admin role (%p)',
  (initialState) => {
    expect(access(initialState).canAdmin).toBeFalsy();
  },
);
