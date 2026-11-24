export async function onRequestGet(): Promise<Response> {
  return Response.json({
    unpublishedCalculators: [],
    importedCalculators: [],
    ads: {
      enabled: true,
      directLink: 'https://uplcm.com/4/12282219',
      frequencyCapMinutes: 15,
      placements: {
        headerBanner: true,
        homeSponsoredCard: true,
        resultPromoCta: true,
        dashboardBanner: true,
        contentPageCard: true,
        footerSponsored: true,
      },
      publisherScriptConfigured: false,
    },
  });
}
