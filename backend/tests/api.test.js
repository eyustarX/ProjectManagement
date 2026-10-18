const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

jest.setTimeout(45000); // 45s for Neon DB cloud queries

describe('CodeAlpha Collaborative Project Management API Integration Test Suite', () => {
  const runId = Date.now();
  let userA = {
    name: 'Alice Project Manager',
    email: `alice_pm_${runId}@example.com`,
    password: 'Password123!',
    token: null,
    id: null,
  };

  let userB = {
    name: 'Bob Developer',
    email: `bob_dev_${runId}@example.com`,
    password: 'Password123!',
    token: null,
    id: null,
  };

  let createdProjectId = null;
  let todoListId = null;
  let inProgressListId = null;
  let createdTaskId = null;
  let createdCommentId = null;
  let userBMemberId = null;

  afterAll(async () => {
    try {
      const userIds = [userA.id, userB.id].filter(Boolean);
      if (userIds.length > 0) {
        // Cascade delete removes owned projects, memberships, tasks, and comments
        await prisma.user.deleteMany({
          where: { id: { in: userIds } },
        });
      }
    } catch (err) {
      console.error('Error during test teardown cleanup:', err.message);
    } finally {
      await prisma.$disconnect();
    }
  });

  describe('1. Health & Base Endpoints', () => {
    it('GET /health - should return 200 and healthy message', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('healthy');
    });

    it('GET /api/v1 - should return API version info', async () => {
      const res = await request(app).get('/api/v1');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.version).toBe('1.0.0');
    });
  });

  describe('2. User Authentication & Member Search', () => {
    it('POST /api/v1/auth/register - fails on missing fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'incomplete@example.com' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/v1/auth/register - successfully registers User A', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: userA.name,
          email: userA.email,
          password: userA.password,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(userA.email);

      userA.id = res.body.data.user.id;
      userA.token = res.body.data.token;
    });

    it('POST /api/v1/auth/register - rejects duplicate email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Clone User',
          email: userA.email,
          password: 'Password123!',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/v1/auth/login - fails with wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userA.email,
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/v1/auth/login - logins User A successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userA.email,
          password: userA.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    it('GET /api/v1/auth/me - returns user profile with Bearer token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(userA.id);
      expect(res.body.data.stats).toBeDefined();
    });

    it('POST /api/v1/auth/register - successfully registers User B', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: userB.name,
          email: userB.email,
          password: userB.password,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      userB.id = res.body.data.user.id;
      userB.token = res.body.data.token;
    });

    it('GET /api/v1/users/search - searches for users to invite', async () => {
      const res = await request(app)
        .get(`/api/v1/users/search?q=${userB.name.split(' ')[0]}`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.some(u => u.id === userB.id);
      expect(found).toBe(true);
    });
  });

  describe('3. Group Projects & Collaborative Memberships', () => {
    it('POST /api/v1/projects - User A creates a new collaborative project', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          name: 'Alpha Product Launch 2026',
          description: 'Roadmap and deliverables for cross-functional sprint.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.lists.length).toBeGreaterThanOrEqual(4); // Default Kanban lists created

      createdProjectId = res.body.data.id;
      todoListId = res.body.data.lists[0].id;
      inProgressListId = res.body.data.lists[1].id;
    });

    it('GET /api/v1/projects - User A lists their active projects', async () => {
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some(p => p.id === createdProjectId)).toBe(true);
    });

    it('GET /api/v1/projects/:id - User B denied access prior to membership', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${createdProjectId}`)
        .set('Authorization', `Bearer ${userB.token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/v1/projects/:id/members - User A invites User B to the project', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${createdProjectId}/members`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          emailOrUserId: userB.email,
          role: 'MEMBER',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe(userB.id);

      userBMemberId = res.body.data.id;
    });

    it('POST /api/v1/projects/:id/members - rejects duplicate member invitation', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${createdProjectId}/members`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          emailOrUserId: userB.email,
        });

      expect(res.status).toBe(409);
    });

    it('GET /api/v1/projects/:id - User B can now access project board', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${createdProjectId}`)
        .set('Authorization', `Bearer ${userB.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.myRole).toBe('MEMBER');
      expect(res.body.data.members.length).toBe(2);
    });
  });

  describe('4. Kanban Columns & Task Cards Management', () => {
    it('POST /api/v1/projects/:id/lists - adds custom workflow column', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${createdProjectId}/lists`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ name: 'Quality Assurance' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Quality Assurance');
    });

    it('POST /api/v1/projects/:id/tasks - User A creates and assigns task to User B', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${createdProjectId}/tasks`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          listId: todoListId,
          title: 'Implement OAuth Login Provider',
          description: 'Set up Google and GitHub OAuth flow with error handling.',
          priority: 'HIGH',
          dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
          assigneeId: userB.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.assignee.id).toBe(userB.id);
      expect(res.body.data.priority).toBe('HIGH');

      createdTaskId = res.body.data.id;
    });

    it('GET /api/v1/tasks/:id - retrieves task card details', async () => {
      const res = await request(app)
        .get(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${userB.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toContain('OAuth');
    });

    it('PATCH /api/v1/tasks/:id - User B moves task to In Progress column', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${userB.token}`)
        .send({
          listId: inProgressListId,
          priority: 'URGENT',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.list.id).toBe(inProgressListId);
      expect(res.body.data.priority).toBe('URGENT');
    });
  });

  describe('5. Task Threaded Comments & Activity Stream', () => {
    it('POST /api/v1/tasks/:id/comments - User B comments on the task', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/${createdTaskId}/comments`)
        .set('Authorization', `Bearer ${userB.token}`)
        .send({ content: 'Started integration on branch feature/oauth.' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe('Started integration on branch feature/oauth.');
      expect(res.body.data.author.id).toBe(userB.id);

      createdCommentId = res.body.data.id;
    });

    it('GET /api/v1/tasks/:id/comments - lists comments for task', async () => {
      const res = await request(app)
        .get(`/api/v1/tasks/${createdTaskId}/comments`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/v1/projects/:id/activities - retrieves project activity audit stream', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${createdProjectId}/activities`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('DELETE /api/v1/comments/:id - User B deletes own comment', async () => {
      const res = await request(app)
        .delete(`/api/v1/comments/${createdCommentId}`)
        .set('Authorization', `Bearer ${userB.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('6. Teardown & Project Cleanup', () => {
    it('DELETE /api/v1/projects/:id/members/:memberId - User B leaves project', async () => {
      const res = await request(app)
        .delete(`/api/v1/projects/${createdProjectId}/members/${userBMemberId}`)
        .set('Authorization', `Bearer ${userB.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('DELETE /api/v1/tasks/:id - User A deletes task card', async () => {
      const res = await request(app)
        .delete(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('DELETE /api/v1/projects/:id - User A deletes project', async () => {
      const res = await request(app)
        .delete(`/api/v1/projects/${createdProjectId}`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
