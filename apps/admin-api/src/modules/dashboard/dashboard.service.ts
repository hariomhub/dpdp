import { getSuperAdminPrisma } from '@dpdp/database'
import { OrgStatus, CourseStatus, ControlStatus } from '@prisma/super-admin-client'

const db = getSuperAdminPrisma()

export const dashboardService = {
  async getStats() {
    const [
      totalOrgs,
      activeOrgs,
      onboardingOrgs,
      suspendedOrgs,
      totalRegulations,
      activeRegulations,
      totalControls,
      publishedControls,
      totalCourses,
      publishedCourses,
      recentActivity,
      recentOrgs,
    ] = await Promise.all([
      db.tenant.count(),
      db.tenant.count({ where: { status: OrgStatus.ACTIVE } }),
      db.tenant.count({ where: { status: OrgStatus.ONBOARDING } }),
      db.tenant.count({ where: { status: OrgStatus.SUSPENDED } }),
      db.regulation.count(),
      db.regulation.count({ where: { status: 'ACTIVE' } }),
      db.control.count({ where: { isCustom: false } }),
      db.control.count({
        where: { isCustom: false, status: ControlStatus.PUBLISHED },
      }),
      db.lmsCourse.count(),
      db.lmsCourse.count({ where: { status: CourseStatus.PUBLISHED } }),
      db.platformAuditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          superAdmin: { select: { name: true } },
          tenant: { select: { name: true } },
        },
      }),
      db.tenant.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          industry: true,
          plan: true,
          status: true,
          createdAt: true,
        },
      }),
    ])

    // Onboarding trend last 12 months
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

    const onboardingTrend = await db.tenant.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: twelveMonthsAgo } },
      _count: { id: true },
    })

    // Group by month
    const trendByMonth: Record<string, number> = {}
    onboardingTrend.forEach(item => {
      const month = new Date(item.createdAt).toLocaleString('default', {
        month: 'short',
        year: 'numeric',
      })
      trendByMonth[month] = (trendByMonth[month] || 0) + item._count.id
    })

    const trend = Object.entries(trendByMonth).map(([month, count]) => ({
      month,
      orgs: count,
    }))

    return {
      orgs: {
        total: totalOrgs,
        active: activeOrgs,
        onboarding: onboardingOrgs,
        suspended: suspendedOrgs,
        inactive: totalOrgs - activeOrgs - onboardingOrgs - suspendedOrgs,
      },
      regulations: {
        total: totalRegulations,
        active: activeRegulations,
      },
      controls: {
        total: totalControls,
        published: publishedControls,
        draft: totalControls - publishedControls,
      },
      courses: {
        total: totalCourses,
        published: publishedCourses,
        draft: totalCourses - publishedCourses,
      },
      recentActivity,
      recentOrgs,
      onboardingTrend: trend,
    }
  },
}