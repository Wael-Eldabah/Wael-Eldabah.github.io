# Asset provenance

## Certification artwork

- `ejpt-official.svg`: official INE eJPT badge, retrieved from the [eJPT certification page](https://ine.com/security/certifications/ejpt-certification). The current provider asset at <https://us-east-1.graphassets.com/AwCYQkwjSUCbfkm08Ct1Mz/cmcc3wze0lx3007irps13e6k3> was byte-identical to the existing local SVG when checked on 11 October 2026.
- `hcia-official.svg`: white HCIA level badge, original vector outlines extracted from Huawei's [Introduction of HCIA Rolling Banner](https://e.huawei.com/marketingcloud/pep/asset/20000001/Material/f853e3b8bdc644c19a87b945255dd6f7/R0S547D001220088202105261624129529814/Introduction%20of%20HCIA%20Rolling%20Banner.pdf). The original shape, lettering and white color are preserved. Duplicate white fills clipped to flower petals in the PDF were omitted after retaining the original petal outlines. This historical asset is no longer displayed by the main credential section in V8.4. The user’s supplied HCIA document records training completion, so the interface now uses the NTI provider logo.

- `nti-official.png`: National Telecommunication Institute logo from <https://www.nti.sci.eg/images/logo.png>, referenced by the institute’s site navigation.
- `iti-official.png`: ITI logo from <https://iti.gov.eg/assets/images/organization/iti-logo.png>, referenced by the official site application.
- The DEPI provider mark is a viewport onto the badge in the user-supplied DEPI Forensics Investigator certificate. The complete document is preserved; no logo is redrawn.
- The Cisco provider mark is a viewport onto the original Cisco logo in the supplied Ethical Hacker certificate. The complete certificate remains available in the viewer. The NTI training context was supplied by Wael; the certificate names ND Universities Online as the course provider and records completion on 28 February 2025.

Issuer names and marks belong to their respective owners. The personal eJPT verification link was supplied by Wael: <https://certs.ine.com/cec37ed6-8feb-495e-bd16-5fe978ef1c0d#acc.IJqoARQM>. Retrieval confirmed a responding application shell, but its dynamic verification content was not independently read in this session. The displayed award date and certification ID come from the supplied certificate.

## User-provided evidence — V8.4

The following attachments were encoded as WebP at original dimensions, without cropping or changing their contents. The interface preserves the complete images in the document viewer. The recognition caption is based on the user’s description of the event.

| Attachment | Published image | Record |
| --- | --- | --- |
| IMG_2389.jpeg | credentials/ejpt.webp | eJPT examination certification |
| IMG_1956.jpeg | credentials/depi-forensics.webp | DEPI Forensics Investigator |
| IMG_0420.png | credentials/iti-pentest.webp | ITI / CyberTalents bootcamp |
| IMG_0855.jpeg | credentials/digitopia-award.webp | Digitopia fourth-place award |
| ef5f1d76-af0e-49b9-bb6f-c2dc2f525c57.jpeg | credentials/hccda-training.webp | Huawei ICT Academy course completion |
| IMG_9726.jpeg | credentials/iti-cybersecurity.webp | ITI 120-hour cybersecurity training |
| IMG_9217.jpeg | credentials/nti-linux.webp | NTI / ITIDA Linux training |
| IMG_5402.jpeg | credentials/depi-pentest.webp | DEPI penetration-testing program |
| IMG_5017.jpeg | credentials/nti-hcia.webp | NTI / Huawei HCIA training |
| IMG_4239.jpeg | credentials/depi-recognition.webp | DEPI recognition ceremony |
| IMG_5512.jpeg | credentials/cisco-ethical-hacker.webp | Cisco Networking Academy Ethical Hacker course completion, added in V8.4.1 |


## Geography

`earth-land.json` contains outer coastline rings from [Natural Earth 1:110m land](https://www.naturalearthdata.com/downloads/110m-physical-vectors/110m-land/), downloaded from the [maintainer's GeoJSON repository](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson). Coordinates were rounded to two decimal places for a small decorative globe. Natural Earth data is [public domain](https://www.naturalearthdata.com/about/terms-of-use/). Signal locations and routes are illustrative interface artwork.

## Fonts

Self-hosted font files and OFL license texts are under `assets/fonts/`.

## Geographic rendering

D3 Geo 3.1.1 provides spherical polygon clipping and Canvas paths. Dependency license files are distributed under `dist/`. City lights and signal particles are decorative, not telemetry or measured population data.
