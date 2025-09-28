const request = require('supertest');
const app = require('../server');
const knex = require('knex')(require('../knexfile').development);

// A reusable agent for making authenticated requests
const agent = request.agent(app);

describe('Authentication Flow', () => {

    // Close the database connection after all tests are done
    afterAll(async () => {
        await knex.destroy();
    });

    describe('GET / (Landing Page)', () => {
        it('should return 200 OK for the landing page', async () => {
            const res = await request(app).get('/');
            expect(res.statusCode).toEqual(200);
            expect(res.headers['content-type']).toMatch(/html/);
        });
    });

    describe('Login and Protected Routes', () => {
        it('should fail to log in with incorrect credentials', async () => {
            const res = await agent
                .post('/auth/login')
                .send({ email: 'e.reed@example.com', password: 'wrongpassword', _csrf: 'test' }); // CSRF is not checked in tests by default
            expect(res.statusCode).toEqual(401); // Unauthorized
        });

        it('should successfully log in with correct teacher credentials', async () => {
            const res = await agent
                .post('/auth/login')
                .send({ email: 'e.reed@example.com', password: 'teacher123', _csrf: 'test' });
            expect(res.statusCode).toEqual(302); // Redirect status
            expect(res.headers.location).toBe('/teacher/dashboard');
        });

        it('should allow access to a protected teacher route after login', async () => {
            const res = await agent.get('/teacher/dashboard');
            expect(res.statusCode).toEqual(200);
        });

        it('should block access to a protected student route for a logged-in teacher', async () => {
            const res = await agent.get('/student/dashboard');
            expect(res.statusCode).toEqual(403); // Forbidden
        });

        it('should log out successfully', async () => {
            const res = await agent.get('/auth/logout');
            expect(res.statusCode).toEqual(302);
            expect(res.headers.location).toBe('/auth/login');
        });

        it('should block access to a protected route after logout', async () => {
            const res = await agent.get('/teacher/dashboard');
            expect(res.statusCode).toEqual(302); // Redirect to login
            expect(res.headers.location).toBe('/auth/login');
        });
    });
});