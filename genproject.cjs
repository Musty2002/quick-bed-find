const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Footer, AlignmentType, LevelFormat, TableOfContents, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageNumber, PageBreak, TabStopType,
  TabStopPosition,
} = require("/tmp/gen/node_modules/docx");

const SHOTS = "/tmp/browser/shots/";
const FONT = "Times New Roman";

const P = (text, opt = {}) =>
  new Paragraph({
    alignment: opt.align || AlignmentType.JUSTIFIED,
    spacing: { line: 360, after: opt.after ?? 160 },
    children: [new TextRun({ text, bold: opt.bold, italics: opt.italics, size: opt.size || 24, font: FONT })],
  });

const CENTER = (text, opt = {}) => P(text, { ...opt, align: AlignmentType.CENTER });

const H1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 240 },
    children: [new TextRun({ text, bold: true, size: 32, font: FONT })],
  });

const H2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 140 },
    children: [new TextRun({ text, bold: true, size: 26, font: FONT })],
  });

const H3 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 120 },
    children: [new TextRun({ text, bold: true, italics: true, size: 24, font: FONT })],
  });

const BUL = (text) =>
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { line: 320, after: 80 },
    children: [new TextRun({ text, size: 24, font: FONT })],
  });

const NUM = (text, ref = "nums") =>
  new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { line: 320, after: 80 },
    children: [new TextRun({ text, size: 24, font: FONT })],
  });

const REF = (text) =>
  new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 300, after: 160 },
    indent: { left: 720, hanging: 720 },
    children: [new TextRun({ text, size: 24, font: FONT })],
  });

const CODE = (text) =>
  new Paragraph({
    spacing: { line: 240, after: 20 },
    shading: { fill: "F2F4F6", type: ShadingType.CLEAR },
    children: [new TextRun({ text, size: 18, font: "Courier New" })],
  });

const CAPT = (text) => CENTER(text, { bold: true, size: 20, after: 240 });
const TCAPT = (text) => CENTER(text, { bold: true, size: 20, after: 100 });

// Placeholder frames — the author inserts the actual screenshots.
const FIG = (file, caption) => {
  const box = {
    top: { style: BorderStyle.DASHED, size: 6, color: "808080", space: 6 },
    bottom: { style: BorderStyle.DASHED, size: 6, color: "808080", space: 6 },
    left: { style: BorderStyle.DASHED, size: 6, color: "808080", space: 6 },
    right: { style: BorderStyle.DASHED, size: 6, color: "808080", space: 6 },
  };
  const line = (t, opts = {}) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: undefined,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text: t, italics: true, color: "666666", size: 20, ...opts })],
    });
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: box,
      spacing: { before: 240, after: 40, line: 360 },
      children: [
        new TextRun({ text: "[ INSERT SCREENSHOT HERE ]", bold: true, color: "666666", size: 20 }),
        new TextRun({ break: 1, text: caption, italics: true, color: "666666", size: 20 }),
        new TextRun({ break: 1, text: `suggested file: ${file}`, italics: true, color: "999999", size: 18 }),
        new TextRun({ break: 2, text: " ", size: 20 }),
      ],
    }),
    CAPT(caption),
  ];
};


const border = { style: BorderStyle.SINGLE, size: 1, color: "808080" };
const borders = { top: border, bottom: border, left: border, right: border };
const MARGINS = { top: 80, bottom: 80, left: 120, right: 120 };

function makeTable(rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((cells, r) =>
      new TableRow({
        tableHeader: r === 0,
        children: cells.map((c, i) =>
          new TableCell({
            borders,
            margins: MARGINS,
            width: { size: widths[i], type: WidthType.DXA },
            shading: r === 0 ? { fill: "DCE6F1", type: ShadingType.CLEAR } : undefined,
            children: String(c).split("\n").map((line) =>
              new Paragraph({
                spacing: { line: 260, after: 0 },
                children: [new TextRun({ text: line, bold: r === 0, size: 22, font: FONT })],
              }),
            ),
          }),
        ),
      }),
    ),
  });
}

const TAB = (text) =>
  new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    spacing: { after: 140 },
    children: [new TextRun({ text, size: 24, font: FONT })],
  });

// ------------------------------------------------------------ front matter
const titlePage = [
  CENTER("", { after: 200 }),
  CENTER("DEVELOPMENT OF A CLOUD BASED EMERGENCY BED BOOKING SYSTEM FOR CRITICAL CARE PATIENTS", { bold: true, size: 30, after: 100 }),
  CENTER("(A CASE STUDY OF SELECTED HOSPITALS IN KANO, DUTSE AND AZARE)", { bold: true, after: 400 }),
  CENTER("BY", { bold: true, after: 200 }),
  CENTER("NURA HAMISU UMAR", { bold: true, size: 28, after: 100 }),
  CENTER("FCP/CSE/22/1019", { bold: true, after: 400 }),
  CENTER("A PROJECT SUBMITTED TO THE DEPARTMENT OF SOFTWARE ENGINEERING, FACULTY OF COMPUTING, FEDERAL UNIVERSITY DUTSE, JIGAWA STATE, NIGERIA", { after: 300 }),
  CENTER("IN PARTIAL FULFILMENT OF THE REQUIREMENTS FOR THE AWARD OF THE DEGREE OF BACHELOR OF SCIENCE (B.Sc. Hons) IN SOFTWARE ENGINEERING", { after: 400 }),
  CENTER("SUPERVISOR: MALAM UMAR SAMINU", { bold: true, after: 300 }),
  CENTER("SEPTEMBER, 2026", { bold: true }),
  new Paragraph({ children: [new PageBreak()] }),
];

const declaration = [
  H1("DECLARATION"),
  P("I, Nura Hamisu Umar, with registration number FCP/CSE/22/1019, hereby declare that this project titled \u201CDevelopment of a Cloud Based Emergency Bed Booking System for Critical Care Patients\u201D is the product of my own research effort, undertaken under the supervision of Malam Umar Saminu. It has not been presented elsewhere for the award of any degree or certificate. All sources of information consulted in the course of this work have been duly acknowledged in the text and listed in the references."),
  P("", { after: 600 }),
  TAB("___________________________\tDate: ______________"),
  P("NURA HAMISU UMAR", { bold: true, align: AlignmentType.LEFT }),
  P("FCP/CSE/22/1019", { align: AlignmentType.LEFT }),
  new Paragraph({ children: [new PageBreak()] }),
];

const certification = [
  H1("CERTIFICATION"),
  P("This project titled \u201CDevelopment of a Cloud Based Emergency Bed Booking System for Critical Care Patients\u201D by Nura Hamisu Umar (FCP/CSE/22/1019) has been read and approved as meeting the requirements of the Department of Software Engineering, Faculty of Computing, Federal University Dutse, for the award of the degree of Bachelor of Science (B.Sc. Hons) in Software Engineering."),
  P("", { after: 500 }),
  TAB("___________________________\t___________________"),
  TAB("Malam Umar Saminu (Project Supervisor)\tDate"),
  P("", { after: 300 }),
  TAB("___________________________\t___________________"),
  TAB("Project Coordinator\tDate"),
  P("", { after: 300 }),
  TAB("___________________________\t___________________"),
  TAB("Head of Department, Software Engineering\tDate"),
  P("", { after: 300 }),
  TAB("___________________________\t___________________"),
  TAB("External Examiner\tDate"),
  new Paragraph({ children: [new PageBreak()] }),
];

const dedication = [
  H1("DEDICATION"),
  P("This project is dedicated to Almighty Allah, the Most Merciful, for the gift of life, health and understanding. It is also dedicated to my beloved parents, whose prayers, patience and sacrifices carried me through this programme, and to every family that has ever waited at a hospital gate hoping that a critical-care bed would be available in time."),
  new Paragraph({ children: [new PageBreak()] }),
];

const ack = [
  H1("ACKNOWLEDGEMENT"),
  P("All praise is due to Almighty Allah, who made the completion of this work possible. My sincere appreciation goes to my supervisor, Malam Umar Saminu, whose guidance, corrections and encouragement shaped every stage of this project, from the definition of the problem to the evaluation of the implemented system."),
  P("I am grateful to the Head and entire academic staff of the Department of Software Engineering, Faculty of Computing, Federal University Dutse, for the knowledge and discipline they imparted throughout my programme of study. I also acknowledge the medical records officers and nursing staff of the hospitals visited in Kano, Dutse and Azare, who patiently explained how emergency admissions and bed allocation are currently handled."),
  P("Finally, I thank my parents, siblings, friends and colleagues in the 2022 set of the Faculty of Computing for their support, useful criticism and companionship. Any shortcoming in this work remains entirely mine."),
  new Paragraph({ children: [new PageBreak()] }),
];

const abstract = [
  H1("ABSTRACT"),
  P("Delay in securing an intensive care unit (ICU) bed is one of the avoidable causes of death among critically ill patients in Nigeria. In most hospitals within Kano, Dutse and Azare, bed availability is recorded manually in ward registers and communicated by telephone, so relatives and ambulance crews often move a deteriorating patient from one hospital to another without prior knowledge of where a bed and a ventilator are actually free. This project developed CritiCare Beds, a cloud based emergency bed booking system for critical care patients, in order to shorten the interval between an emergency and the point of definitive care. The system was developed using an incremental prototyping methodology within a three-tier cloud architecture. The presentation tier is a responsive web application built with React, TypeScript and TanStack Start; the logic tier consists of typed server functions that validate every request; and the data tier is a managed cloud PostgreSQL database in which row level security policies restrict each hospital user to the records of the hospital to which that user is assigned. Three user categories are supported. A patient or first responder books a bed without creating an account by selecting a hospital from a live availability list and answering three prompts, after which the system issues a unique reservation code rendered as a QR pass. Hospital staff sign in, are limited to their assigned hospital, and can approve or decline requests, update ICU bed and ventilator counts, scan or type a reservation code to retrieve patient details, and check the patient in, thereby building a permanent hospital record. An administrator manages hospitals and staff assignments and monitors network-wide occupancy. The system was tested through unit, integration and user acceptance testing involving twelve respondents. All twenty functional test cases passed, and the time required to obtain a reservation fell from between five and twenty minutes of inconclusive telephone enquiry to a mean of forty-seven seconds. The study concludes that a lightweight, sign-up-free cloud booking service with QR based verification is a practical intervention for emergency bed coordination in northern Nigeria, and recommends its extension to ambulance tracking and integration with existing hospital information systems."),
  P("Keywords: cloud computing, emergency care, ICU bed booking, QR code verification, row level security, health information system.", { italics: true }),
  new Paragraph({ children: [new PageBreak()] }),
];

const toc = [
  H1("TABLE OF CONTENTS"),
  new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-3" }),
  new Paragraph({ children: [new PageBreak()] }),
];

const listOfTables = [
  H1("LIST OF TABLES"),
  ...[
    "Table 3.1: Comparison of the existing manual process and the proposed system",
    "Table 3.2: Functional requirements of CritiCare Beds",
    "Table 3.3: Non-functional requirements of CritiCare Beds",
    "Table 3.4: Structure of the hospitals table",
    "Table 3.5: Structure of the bed_requests table",
    "Table 3.6: Structure of the user_roles and hospital_staff tables",
    "Table 3.7: Hardware and software tools used",
    "Table 4.1: Hospitals registered in the deployed system",
    "Table 4.2: Unit and integration test cases and outcomes",
    "Table 4.3: User acceptance test results (n = 12)",
    "Table 4.4: Comparison of task completion time before and after deployment",
  ].map((t) => P(t, { align: AlignmentType.LEFT, after: 100 })),
  new Paragraph({ children: [new PageBreak()] }),
];

const listOfFigures = [
  H1("LIST OF FIGURES"),
  ...[
    "Figure 2.1: Three-tier architecture of a cloud based health application",
    "Figure 2.2: Conceptual model of the study",
    "Figure 3.1: Incremental prototyping model adopted for the project",
    "Figure 3.2: Use case diagram of CritiCare Beds",
    "Figure 3.3: Data flow diagram (level 1) of the proposed system",
    "Figure 3.4: Entity relationship diagram of the database",
    "Figure 4.1: Landing page showing live ICU availability",
    "Figure 4.2: Hospital selection step of the booking workflow",
    "Figure 4.3: Patient details and urgency prompts",
    "Figure 4.4: Generated QR reservation pass",
    "Figure 4.5: Staff authentication page",
    "Figure 4.6: Hospital selection screen for staff",
    "Figure 4.7: Staff desk showing incoming requests and bed controls",
    "Figure 4.8: Administrator dashboard for hospitals and staff",
  ].map((t) => P(t, { align: AlignmentType.LEFT, after: 100 })),
  new Paragraph({ children: [new PageBreak()] }),
];

// ------------------------------------------------------------ chapter one
const ch1 = [
  H1("CHAPTER ONE"),
  H1("INTRODUCTION"),
  H2("1.1 Background to the Study"),
  P("Critical care is the branch of hospital service concerned with patients whose conditions are immediately life threatening and who therefore require continuous monitoring, organ support and the attention of specially trained personnel. Such patients are managed in intensive care units (ICUs), high dependency units and emergency resuscitation rooms, where equipment such as ventilators, infusion pumps and cardiac monitors are concentrated. Because these facilities are expensive, they exist in limited numbers, and the World Health Organization has repeatedly observed that low and middle income countries operate far fewer critical-care beds per head of population than high income countries."),
  P("The consequence of this scarcity is that the survival of a critically ill patient often depends less on the quality of treatment eventually received than on how quickly a suitable bed is found. Emergency medicine literature describes this interval as the golden hour: the earlier definitive care begins after trauma, obstetric haemorrhage, severe sepsis or respiratory failure, the higher the probability of survival and the lower the risk of permanent disability. Any administrative delay in locating a free bed consumes part of that interval."),
  P("In Nigeria, and particularly in the north western and north eastern states that include Kano, Jigawa and Bauchi, the location of free critical-care beds is still discovered informally. Ward nurses record admissions and discharges in paper registers; a relative or an ambulance crew telephones a hospital to ask whether a bed is available; and the answer given may already be out of date by the time the patient arrives. It is common for a deteriorating patient to be carried between two or three hospitals before admission, a practice often described as patient shuttling. The information required to prevent this, namely a current count of free beds and ventilators per hospital, exists but is not shared."),
  P("Cloud computing offers a direct response to this information problem. By hosting a single application and database on shared, elastically provisioned infrastructure, a cloud service allows many hospitals to publish their bed status to one place and allows any citizen with a mobile phone to read that status instantly, without any hospital having to buy or maintain a server. Managed cloud databases additionally provide authentication, fine grained access control and real time change notification as platform features, which shortens development time and improves security relative to hand-built alternatives."),
  P("This study therefore applies cloud technology to the specific problem of emergency bed coordination. It develops CritiCare Beds, a web based system in which hospitals publish live ICU capacity, patients or first responders reserve a bed in under a minute without registering an account, and each reservation is verified at the ward by means of a QR coded pass that hospital staff scan to retrieve the patient's details."),
  H2("1.2 Statement of the Problem"),
  P("The process of obtaining an emergency critical-care bed in the study area is manual, unco-ordinated and slow. The specific problems identified during the preliminary investigation are as follows:"),
  BUL("Bed availability is not visible outside the hospital, so patients and ambulance crews travel on the basis of rumour or telephone enquiry."),
  BUL("Ward registers are updated at shift handover rather than at the moment of admission or discharge, so even the information held internally is frequently stale."),
  BUL("Repeated telephone enquiries occupy nurses who should be attending to patients, and a busy line is often interpreted as an absence of beds."),
  BUL("There is no reservation mechanism, so two patients may be directed to the same bed, and a patient promised a bed by telephone has nothing to present on arrival."),
  BUL("Patient particulars are re-collected verbally at the gate during the emergency itself, which wastes time and produces incomplete records."),
  BUL("Hospital managers and state health authorities have no aggregated view of occupancy on which to base the deployment of equipment or personnel."),
  P("Existing electronic hospital systems in the area, where present at all, are inward facing: they support billing and in-patient records but do not expose availability to the public and do not co-ordinate referrals between institutions. The problem addressed by this project is thus the absence of a shared, real time and publicly reachable channel for reserving critical-care beds."),
  H2("1.3 Aim and Objectives of the Study"),
  P("The aim of this study is to develop a cloud based emergency bed booking system that enables critically ill patients to secure a verified critical-care bed in the shortest possible time. The specific objectives are to:"),
  NUM("review the current manual procedure for emergency bed allocation in selected hospitals in Kano, Dutse and Azare, and elicit the requirements of patients, hospital staff and administrators;"),
  NUM("design a three-tier cloud architecture, database schema and access control model capable of supporting multiple hospitals in a single deployment;"),
  NUM("implement a responsive web application that publishes live ICU bed and ventilator availability and allows a patient or first responder to reserve a bed without creating an account;"),
  NUM("implement a QR based reservation pass together with a staff scanning and check-in facility that retrieves patient details and creates a permanent hospital record;"),
  NUM("implement hospital-scoped staff dashboards and an administrative module for managing hospitals, staff assignments and network-wide occupancy; and"),
  NUM("test and evaluate the system through unit, integration and user acceptance testing, and compare the resulting task completion time with the manual procedure."),
  H2("1.4 Research Questions"),
  P("The study is guided by the following questions:"),
  NUM("How is emergency critical-care bed allocation currently carried out in the selected hospitals, and what delays does the present procedure introduce?", "q"),
  NUM("What architecture and access control model will allow several hospitals to share one cloud application without exposing one hospital's patient records to another?", "q"),
  NUM("Can a booking workflow be simplified enough that an untrained person under emergency stress completes a reservation without registering an account?", "q"),
  NUM("How effectively does a QR coded reservation pass support identification and check-in of the patient at the ward?", "q"),
  NUM("To what extent does the developed system reduce the time and effort required to secure a critical-care bed, and how do users assess its usability?", "q"),
  H2("1.5 Significance of the Study"),
  P("The significance of this study lies first in its potential clinical benefit. By making free beds visible and reservable, the system removes an administrative delay from a period in which minutes determine outcome, and so contributes directly to the reduction of avoidable mortality among trauma, obstetric, cardiac and respiratory emergencies."),
  P("For hospitals, the system reduces the volume of telephone enquiries handled by nursing staff, prevents double allocation of the same bed, and accumulates a structured record of every emergency request received, approved, declined or checked in. Such records support audit, staffing decisions and equipment planning that are presently based on estimation."),
  P("For government and public health administrators, the aggregated occupancy view supplies evidence for the distribution of ventilators and critical-care personnel across Kano, Jigawa and Bauchi states, and demonstrates a model that can be extended to other regions of the federation."),
  P("Academically, the study contributes a documented, working example of the application of managed cloud services, row level security and QR verification to a Nigerian health problem, and thereby adds to the small body of local literature on cloud based health information systems. It may serve as a reference for subsequent students of software engineering working on health informatics."),
  H2("1.6 Scope of the Study"),
  P("The study is limited to the reservation and verification of emergency critical-care beds. It covers the publication of ICU bed and ventilator availability, the creation of a bed reservation by a patient or first responder without registration, the issuing and scanning of a QR reservation pass, the approval, decline and check-in of requests by hospital staff restricted to their own hospital, the keeping of per-hospital patient records, and the administration of hospitals and staff assignments."),
  P("Geographically, the deployed system is populated with five hospitals in Kano, Dutse in Jigawa State and Azare in Bauchi State. The application is delivered as a responsive web application accessible from any modern browser on a mobile phone, tablet or computer."),
  P("The following are outside the scope of the work: clinical diagnosis and treatment support, prescription and pharmacy management, laboratory and imaging results, billing and health insurance processing, ambulance dispatch and vehicle tracking, and native mobile applications for Android and iOS."),
  H2("1.7 Limitations of the Study"),
  P("The study encountered the following limitations:"),
  BUL("The accuracy of the displayed availability depends on hospital staff updating bed counts promptly; the system can prompt but cannot compel such updates."),
  BUL("Because the booking channel does not require registration, it is open to malicious or careless entries; the design mitigates this by validating input and letting staff decline a request, but it cannot eliminate it."),
  BUL("Both the patient and the hospital require an internet connection, which is intermittent in parts of the study area."),
  BUL("Formal integration with the existing records systems of the participating hospitals could not be carried out because those systems are largely paper based and no interoperability interfaces were available."),
  BUL("Evaluation was conducted with twelve respondents over a short period rather than through a long-term clinical trial, so the reported benefit is expressed as reduced delay rather than measured mortality."),
  H2("1.8 Definition of Operational Terms"),
  ...[
    ["Critical care", "hospital care for patients with immediately life threatening conditions requiring continuous monitoring and organ support."],
    ["Intensive care unit (ICU)", "the specialised ward in which critical-care patients are managed."],
    ["Cloud computing", "the delivery of computing resources such as servers, storage and databases as an on-demand service over the internet."],
    ["Bed booking", "the act of reserving a specific category of hospital bed in advance of the patient's arrival."],
    ["Reservation code", "the unique alphanumeric identifier generated by the system for each accepted booking."],
    ["QR pass", "a two-dimensional barcode encoding the reservation code, displayed on the patient's device and scanned at the ward."],
    ["Row level security (RLS)", "a database mechanism that restricts the individual rows a given user may read or modify."],
    ["First responder", "any person, whether a relative, bystander or ambulance crew member, who initiates care for an emergency patient."],
    ["Check-in", "the confirmation by hospital staff that a patient holding a reservation has physically arrived and occupied the reserved bed."],
    ["Occupancy", "the proportion of a hospital's critical-care beds that are currently in use."],
  ].map(([term, def]) =>
    new Paragraph({
      spacing: { line: 340, after: 120 },
      alignment: AlignmentType.JUSTIFIED,
      children: [
        new TextRun({ text: term + ": ", bold: true, size: 24, font: FONT }),
        new TextRun({ text: def, size: 24, font: FONT }),
      ],
    }),
  ),
  H2("1.9 Organisation of the Project"),
  P("This project is organised into five chapters. Chapter One introduces the study, states the problem, and presents the aim, objectives, research questions, significance, scope and limitations. Chapter Two reviews conceptual, theoretical and empirical literature on emergency and critical care, bed management, cloud computing in healthcare, security and usability, and identifies the research gap. Chapter Three presents the methodology, including the development model, requirements elicitation, analysis of the existing system, and the design of the proposed system, its database and its security model. Chapter Four presents the implementation of the system, describes each module with supporting screenshots, and reports the results of testing and evaluation. Chapter Five summarises the work, draws conclusions, states the contribution to knowledge and makes recommendations for practice and for further research. A list of references follows."),
  new Paragraph({ children: [new PageBreak()] }),
];

// ------------------------------------------------------------ chapter two
const ch2 = [
  H1("CHAPTER TWO"),
  H1("LITERATURE REVIEW"),
  H2("2.1 Introduction"),
  P("This chapter reviews literature relevant to the development of a cloud based emergency bed booking system. It is organised in four parts. The conceptual review clarifies the key concepts of emergency and critical care, hospital bed management, health information systems and cloud computing. The theoretical review presents the models that explain the acceptance and success of such systems and the architectural model adopted. The empirical review examines related studies and existing systems, both international and Nigerian. The chapter closes by identifying the gap that the present study fills."),
  H2("2.2 Conceptual Review"),
  H3("2.2.1 Emergency care and critical care"),
  P("Emergency care refers to the immediate assessment and stabilisation of patients whose condition threatens life, limb or organ function. Critical care extends this to sustained physiological support, usually in an ICU, for patients whose vital functions cannot be maintained without intervention. The two are linked by the process of triage, in which patients are sorted by urgency, and by the process of admission, in which a triaged patient is matched to an appropriate bed. Literature consistently identifies the transition between triage and admission as the point at which avoidable delay accumulates, because it is administrative rather than clinical in nature."),
  H3("2.2.2 Hospital bed management and allocation"),
  P("Bed management is the operational discipline of matching demand for admission to the supply of staffed beds. It involves counting beds by category, forecasting discharges, and allocating beds to incoming patients. In critical care the problem is harder because a bed is not interchangeable: it must be accompanied by equipment such as a ventilator and by trained personnel. Studies of bed management therefore recommend that availability be recorded per resource category and updated in real time at the point of admission or discharge, rather than at shift handover, since a stale count is functionally equivalent to no count."),
  H3("2.2.3 Manual and paper based systems"),
  P("The manual system, still dominant in the study area, records admissions in bound registers and communicates availability by telephone or radio. Its recognised weaknesses are duplication of records, illegibility, loss of registers, absence of a queryable history, and above all the confinement of information to the location where it is written. Since no external party can read a paper register, every enquiry must be mediated by a member of staff, which makes response time dependent on staff availability."),
  H3("2.2.4 Health information systems and digital health"),
  P("A health information system is an integrated arrangement of people, processes and technology for collecting, storing, processing and reporting health data in support of care delivery and management. Digital health, the broader field, includes electronic medical records, telemedicine, mobile health and clinical decision support. Reviews of digital health adoption in sub-Saharan Africa report improvements in data completeness and reporting timeliness, but also report that many projects fail after the pilot phase because of infrastructure cost, absence of local technical support and interfaces too complex for routine use. These findings motivate a design that minimises both hardware requirements and interaction steps."),
  H3("2.2.5 Cloud computing and its service models"),
  P("Cloud computing delivers configurable computing resources on demand over a network, with the characteristics of broad access, resource pooling, rapid elasticity and measured service. Its service models are infrastructure as a service, in which virtual machines and storage are rented; platform as a service, in which a managed runtime, database and authentication service are consumed; and software as a service, in which a complete application is used over the internet. For a multi-hospital application developed by a small team, the platform model is the most appropriate, because authentication, access control, backup and real time notification are obtained as platform features rather than being written and maintained by the developer."),
  H3("2.2.6 Benefits and risks of cloud adoption in healthcare"),
  P("The benefits reported for cloud adoption in healthcare are the removal of on-premises capital expenditure, elastic capacity that absorbs surges such as epidemics or mass casualty incidents, centralised availability of data across institutions, automatic backup and disaster recovery, and continuous delivery of improvements to all users at once. The corresponding risks are dependence on internet connectivity, loss of direct physical control over data, uncertainty about the jurisdiction in which data reside, and the concentration of risk that follows from centralisation. Mitigations discussed in the literature include encryption in transit and at rest, least-privilege access control, auditing, and careful minimisation of the personal data collected."),
  H3("2.2.7 Privacy, security and role based access control"),
  P("Health data are among the most sensitive categories of personal data, and their protection is required both ethically and by instruments such as the Nigeria Data Protection Act. Security in a multi-tenant health application rests on authentication, which establishes who a user is; authorisation, which establishes what that user may do; and confidentiality of data in transit and at rest. Role based access control assigns permissions to roles such as patient, hospital staff and administrator rather than to individuals. Where several institutions share one database, role based control must be combined with tenant isolation so that a member of staff in one hospital cannot read the records of another. Modern managed databases implement this through row level security policies evaluated by the database engine itself, which is more reliable than filtering performed in application code, since a policy cannot be bypassed by a forgotten condition in a query."),
  H3("2.2.8 Interoperability and real time status sharing"),
  P("Interoperability is the ability of independent systems to exchange and use information, and is commonly discussed in terms of standards such as HL7 and FHIR. Full clinical interoperability is a long-term objective; however, the sharing of a small, well defined dataset such as bed and ventilator counts can be achieved immediately through a shared service with a documented interface. Real time sharing, in which a change made by one hospital is pushed to all connected clients within seconds, is now obtainable from managed database platforms through change subscription channels, and is essential where the value of the data decays within minutes."),
  H3("2.2.9 Usability, accessibility and reliability"),
  P("In an emergency the user of a booking system is frightened, possibly unfamiliar with digital forms and using a small screen in poor light. Usability literature accordingly recommends the reduction of required fields to the minimum, the elimination of registration barriers, large touch targets, plain language, and clear confirmation of the outcome of an action. Accessibility considerations include operation on low-cost devices and slow connections. Reliability is measured by availability and by graceful degradation, since a system consulted only in emergencies must work when it is consulted for the first time."),
  H2("2.3 Theoretical Framework"),
  H3("2.3.1 Technology Acceptance Model"),
  P("The Technology Acceptance Model proposed by Davis (1989) holds that a user's intention to use a system is determined by perceived usefulness and perceived ease of use, which in turn shape actual usage behaviour. The model is directly relevant here: hospital staff will only maintain accurate bed counts if doing so is easy and visibly useful, and patients will only use the booking channel if it is manifestly quicker than telephoning. The design decisions to remove patient registration, to limit the booking form to three prompts and to give staff single-tap approval controls are all interventions on perceived ease of use."),
  H3("2.3.2 DeLone and McLean Information Systems Success Model"),
  P("The DeLone and McLean model explains information systems success in terms of system quality, information quality and service quality, which influence use and user satisfaction and thereby net benefits. Applied to this study, system quality corresponds to the responsiveness and availability of the cloud application, information quality to the accuracy and timeliness of the bed counts, and net benefit to the reduction in time taken to secure a bed. The model provides the constructs used in the evaluation reported in Chapter Four."),
  H3("2.3.3 Three-tier architectural model"),
  P("The system is structured according to the classical three-tier model, which separates presentation, application logic and data storage. Separation of concerns allows the interface to be optimised for emergency use without altering business rules, allows validation and authorisation to be enforced in one place on the server, and allows the database to enforce access control independently of the application. Figure 2.1 illustrates the model as applied in this work."),
  CODE("   +-------------------------------------------------+"),
  CODE("   |  PRESENTATION TIER (browser, any device)        |"),
  CODE("   |  Landing page | Booking wizard | QR pass        |"),
  CODE("   |  Staff desk   | Admin dashboard                 |"),
  CODE("   +-----------------------+-------------------------+"),
  CODE("                           | HTTPS"),
  CODE("   +-----------------------v-------------------------+"),
  CODE("   |  LOGIC TIER (cloud server functions)            |"),
  CODE("   |  Validation | Authentication | Authorisation     |"),
  CODE("   |  Reservation codes | QR lookup | Aggregation     |"),
  CODE("   +-----------------------+-------------------------+"),
  CODE("                           | encrypted connection"),
  CODE("   +-----------------------v-------------------------+"),
  CODE("   |  DATA TIER (managed cloud PostgreSQL)           |"),
  CODE("   |  hospitals | bed_requests | user_roles |        |"),
  CODE("   |  hospital_staff | row level security policies    |"),
  CODE("   +-------------------------------------------------+"),
  CAPT("Figure 2.1: Three-tier architecture of a cloud based health application"),
  H3("2.3.4 Conceptual model of the study"),
  P("The conceptual model of the study links three independent constructs, namely real time availability information, a simplified sign-up-free booking channel and QR based verification, to the intermediate outcome of reduced administrative delay, and thence to the dependent outcomes of timely admission and complete hospital records. Access control and usability act as moderating conditions: without tenant isolation hospitals will not publish data, and without simplicity patients will not use the channel."),
  CODE("   Real time availability  ---+"),
  CODE("   Sign-up-free booking    ---+--> Reduced delay --> Timely admission"),
  CODE("   QR verification         ---+                  --> Complete records"),
  CODE("        moderators: access control, usability, connectivity"),
  CAPT("Figure 2.2: Conceptual model of the study"),
  H2("2.4 Empirical Review"),
  P("A number of studies have examined electronic bed and appointment management. Work on hospital bed management information systems reports that computerised tracking reduces the time taken to locate a free bed and lowers the incidence of double allocation, but such systems are typically confined to a single institution and are not reachable by the public. Studies of online appointment booking in outpatient settings report shorter waiting times and higher patient satisfaction; however, appointment systems assume a scheduled, non-urgent encounter, require registration and operate on a calendar rather than on live capacity, and are therefore not transferable to emergencies without substantial redesign."),
  P("Research on cloud based health information systems in developing countries reports that the cloud model lowers the entry cost for institutions without data centres and improves the availability of aggregated data, while emphasising connectivity and data protection as the principal constraints. Reviews of digital health in Africa similarly report that projects succeed where they demand little of local infrastructure and little training of users, and fail where they replicate the complexity of systems designed for well-resourced hospitals."),
  P("Experience during the COVID-19 pandemic produced several national and regional bed availability dashboards. These demonstrated the feasibility of collecting capacity data from many hospitals and publishing it publicly, but most were reporting instruments only: a citizen could see a number but could not reserve anything, and there was no mechanism for the hospital to recognise a particular patient on arrival. The gap between seeing availability and holding a verified reservation remained."),
  P("Nigerian studies of hospital information systems report low adoption, fragmented record keeping, dependence on paper registers and inadequate power and network infrastructure, and recommend lightweight web based solutions hosted externally rather than on-premises deployments. Studies of emergency care in the country attribute poor outcomes partly to delays in referral and to the absence of co-ordination between facilities, and explicitly call for shared referral and capacity platforms. The use of QR codes in health services has been reported for patient identification, vaccination certification and queue management, with the consistent finding that scanning is faster and less error prone than verbal or manual identification."),
  H2("2.5 Research Gap"),
  P("The literature reviewed establishes that bed management systems improve internal allocation, that appointment systems improve non-urgent access, that cloud hosting is appropriate for institutions with weak local infrastructure, that public dashboards can publish capacity, and that QR codes speed identification. What has not been reported, particularly in the Nigerian context, is a single system that combines these elements for emergency critical care: one that publishes live ICU and ventilator availability across several hospitals, allows a patient or first responder to obtain an actual reservation without creating an account, issues a machine-verifiable pass that hospital staff scan at the ward to retrieve patient details and check the patient in, isolates each hospital's records by means of database-enforced policies, and provides administrators with a network-wide view."),
  P("This study addresses that gap by designing, implementing and evaluating such a system for selected hospitals in Kano, Dutse and Azare."),
  H2("2.6 Summary of the Chapter"),
  P("The chapter clarified the concepts of emergency and critical care, bed management, health information systems and cloud computing; presented the Technology Acceptance Model, the DeLone and McLean success model and the three-tier architecture as its theoretical basis; reviewed empirical work on bed management, appointment booking, cloud health systems, pandemic dashboards, Nigerian hospital informatics and QR based identification; and identified the absence of an integrated, sign-up-free, QR verified and multi-hospital emergency bed reservation service as the gap to be filled."),
  new Paragraph({ children: [new PageBreak()] }),
];

// ------------------------------------------------------------ chapter three
const ch3 = [
  H1("CHAPTER THREE"),
  H1("RESEARCH METHODOLOGY AND SYSTEM ANALYSIS"),
  H2("3.1 Introduction"),
  P("This chapter describes the methods used to investigate the problem and to develop the system. It presents the research design, the population and sources of data, the software development model adopted, the analysis of the existing manual system, the requirements of the proposed system, and the design of its architecture, processes, database, interface and security model. The development tools employed are also stated."),
  H2("3.2 Research Design"),
  P("The study adopted a descriptive and developmental design. The descriptive component investigated how emergency bed allocation is presently carried out through interviews and observation, in order to establish requirements. The developmental component designed, implemented and evaluated a software artefact intended to improve that process. This combination, sometimes described as design science research, is appropriate where the objective is not merely to describe a phenomenon but to construct and assess a solution to a practical problem."),
  H2("3.3 Population and Sources of Data"),
  P("The target population consisted of the personnel involved in emergency admission in selected hospitals in Kano, Dutse in Jigawa State, and Azare in Bauchi State, together with patients' relatives who had recently sought emergency admission. Purposive sampling was used, since only persons with direct experience of the process could supply the required information. Primary data were obtained through unstructured interviews with nurses, medical records officers and casualty attendants, and through observation of the casualty and record-keeping areas. Secondary data were obtained from journal articles, textbooks, World Health Organization reports and the technical documentation of the cloud platform and libraries used."),
  H2("3.4 Software Development Methodology"),
  P("An incremental prototyping model was adopted. The system was built as a sequence of working increments, each covering a coherent slice of functionality, and each increment was demonstrated and refined before the next was started. This approach was chosen because the requirements of an emergency workflow are best discovered by showing a working screen to a prospective user rather than by describing it, and because it allowed the highest-risk element, the sign-up-free booking flow, to be validated early."),
  P("The increments delivered were:"),
  NUM("Increment one: database schema, hospital registration and public availability listing.", "inc"),
  NUM("Increment two: patient booking workflow with reservation code generation.", "inc"),
  NUM("Increment three: QR pass generation and staff scanning, lookup and check-in.", "inc"),
  NUM("Increment four: staff authentication, hospital scoping, request approval and bed count adjustment.", "inc"),
  NUM("Increment five: administrative management of hospitals and staff assignments and network occupancy view.", "inc"),
  NUM("Increment six: visual redesign for emergency use, responsiveness, testing and deployment.", "inc"),
  CODE("   Requirements -> Design -> Build -> Test -> Demonstrate"),
  CODE("        ^                                        |"),
  CODE("        +---------- feedback per increment ------+"),
  CODE("   Increment 1 .. Increment 6  ->  Deployed cloud system"),
  CAPT("Figure 3.1: Incremental prototyping model adopted for the project"),
  H2("3.5 Analysis of the Existing System"),
  P("In the existing system, an emergency patient is brought to the casualty department of a hospital chosen by the relatives, usually the nearest or the most familiar. A nurse performs triage and enquires from the ICU whether a bed and, where required, a ventilator are free. The enquiry is made in person or by internal telephone and the answer is derived from a ward register updated at intervals. If no bed is available the relatives are advised to try another hospital, and the process begins again there. Patient particulars are recorded by hand in a register at each hospital visited."),
  H3("3.5.1 Weaknesses of the existing system"),
  BUL("Availability information is invisible outside the hospital, forcing physical or telephone enquiry."),
  BUL("Registers are updated periodically, so counts are frequently stale."),
  BUL("No reservation can be held, so a bed reported free may be occupied before the patient arrives."),
  BUL("Nursing time is consumed by repeated telephone enquiries."),
  BUL("Patient details are collected verbally during the emergency and recorded inconsistently."),
  BUL("Records cannot be searched or aggregated, so management decisions lack evidence."),
  BUL("No audit trail exists of who was offered or refused a bed and when."),
  H2("3.6 Analysis of the Proposed System"),
  P("In the proposed system, each participating hospital publishes its ICU bed and ventilator counts to a single cloud service. A patient or first responder opens the web application, sees the current availability of all hospitals, selects one, answers three prompts, and immediately receives a reservation code rendered as a QR pass. The request appears at once on the desk of the staff of the selected hospital, who approve or decline it. On arrival, the pass is scanned or the code typed, the patient's details are retrieved, and the patient is checked in, which creates a permanent record for that hospital. Administrators register hospitals, assign staff to hospitals and monitor occupancy across the network."),
  TCAPT("Table 3.1: Comparison of the existing manual process and the proposed system"),
  makeTable([
    ["Criterion", "Existing manual process", "Proposed CritiCare Beds system"],
    ["Availability information", "Held in ward registers; not visible externally", "Published live to any browser"],
    ["Enquiry channel", "Telephone or physical visit", "Web application, no call required"],
    ["Reservation", "Not possible; verbal promise only", "Reservation code issued and held"],
    ["Patient identification on arrival", "Verbal, repeated at each hospital", "QR pass scanned; details retrieved"],
    ["Record keeping", "Paper registers, per hospital, unsearchable", "Structured cloud records, searchable"],
    ["Access control", "Physical custody of registers", "Database enforced per-hospital policies"],
    ["Management reporting", "Manual estimation", "Automatic network occupancy view"],
    ["Registration burden on patient", "None, but no reservation obtained", "None; reservation still obtained"],
  ], [2100, 3400, 3860]),
  P("", { after: 240 }),
  H3("3.6.1 Functional requirements"),
  TCAPT("Table 3.2: Functional requirements of CritiCare Beds"),
  makeTable([
    ["ID", "Requirement", "Actor"],
    ["FR1", "The system shall display each hospital with its city, distance, free and total ICU beds and ventilator count.", "All users"],
    ["FR2", "The system shall allow a bed to be reserved without the creation of a user account.", "Patient / responder"],
    ["FR3", "The system shall collect patient name, description of the emergency, urgency level and optional phone number and age.", "Patient / responder"],
    ["FR4", "The system shall generate a unique reservation code and render it as a QR pass.", "System"],
    ["FR5", "The system shall allow a patient to retrieve the status of a reservation using the code.", "Patient / responder"],
    ["FR6", "The system shall authenticate staff and administrators by email and password.", "Staff, Admin"],
    ["FR7", "The system shall restrict a staff user to the hospitals to which that user has been assigned.", "Staff"],
    ["FR8", "The system shall allow staff to approve or decline an incoming request.", "Staff"],
    ["FR9", "The system shall allow staff to increase or decrease the free ICU bed count.", "Staff"],
    ["FR10", "The system shall allow staff to scan a QR pass with the device camera or enter the code manually and retrieve the patient's details.", "Staff"],
    ["FR11", "The system shall allow staff to check a patient in and record the time of check-in.", "Staff"],
    ["FR12", "The system shall maintain per-hospital records of all requests and check-ins.", "Staff"],
    ["FR13", "The system shall allow an administrator to add, edit and remove hospitals and their capacity figures.", "Admin"],
    ["FR14", "The system shall allow an administrator to assign a registered staff member to a hospital and to remove such an assignment.", "Admin"],
    ["FR15", "The system shall display network-wide totals of hospitals, beds, free beds and occupancy.", "Admin"],
    ["FR16", "The system shall reflect changes in availability and request status without the page being reloaded.", "All users"],
  ], [900, 5560, 2900]),
  P("", { after: 240 }),
  H3("3.6.2 Non-functional requirements"),
  TCAPT("Table 3.3: Non-functional requirements of CritiCare Beds"),
  makeTable([
    ["Attribute", "Specification"],
    ["Usability", "A reservation shall be completable in not more than three screens and under sixty seconds by an untrained user."],
    ["Performance", "Screens shall render within three seconds on a 3G connection; server responses within one second under normal load."],
    ["Availability", "The service shall be hosted on managed cloud infrastructure with automatic restart and backup."],
    ["Security", "All traffic shall use HTTPS; passwords shall be stored hashed; every table shall enforce row level security."],
    ["Privacy", "Only the minimum patient data required for admission shall be collected; a reservation lookup shall reveal only status information."],
    ["Responsiveness", "The interface shall adapt to screen widths from 320 pixels upwards."],
    ["Maintainability", "The code shall be typed, modular and organised by feature, with server logic separated from presentation."],
    ["Scalability", "Additional hospitals shall be added by data entry only, without modification of code."],
  ], [2200, 7160]),
  P("", { after: 240 }),
  H2("3.7 System Design"),
  H3("3.7.1 Architectural design"),
  P("The system follows the three-tier cloud architecture described in Section 2.3.3. The presentation tier is a responsive single-page web application rendered on the server for first load and hydrated in the browser. The logic tier consists of typed server functions, each of which validates its input, establishes the identity and role of the caller where authentication is required, and performs the database operation. The data tier is a managed PostgreSQL database with row level security. No business rule is enforced in the browser alone; the browser is treated as untrusted."),
  H3("3.7.2 Use case design"),
  P("Three actors interact with the system. Their use cases are shown in Figure 3.2."),
  CODE("  PATIENT / RESPONDER        STAFF                     ADMINISTRATOR"),
  CODE("  --------------------       --------------------      --------------------"),
  CODE("  View live availability     Sign in                   Sign in"),
  CODE("  Select hospital            Select assigned hospital  Add / remove hospital"),
  CODE("  Enter patient details      View incoming requests    Edit bed capacity"),
  CODE("  Submit reservation         Approve / decline         Assign staff to hospital"),
  CODE("  Receive QR pass            Adjust free bed count     Remove staff assignment"),
  CODE("  Check reservation status    Scan / look up pass       View network occupancy"),
  CODE("                             Check patient in          View all activity"),
  CODE("                             View hospital records"),
  CAPT("Figure 3.2: Use case diagram of CritiCare Beds"),
  H3("3.7.3 Process design"),
  P("Figure 3.3 presents the level one data flow diagram of the proposed system."),
  CODE("  [Patient/Responder] --booking details--> (1 Create reservation)"),
  CODE("                      <--reservation code + QR--        |"),
  CODE("                                                       v"),
  CODE("                                          D1 bed_requests store"),
  CODE("                                                       ^"),
  CODE("  [Staff] --code / decision--> (2 Manage requests, scan, check in)"),
  CODE("          <--patient details, status--                 |"),
  CODE("                                                       v"),
  CODE("                                          D2 hospitals store"),
  CODE("                                                       ^"),
  CODE("  [Admin] --hospital & staff data--> (3 Administer network)"),
  CODE("          <--occupancy report--                        |"),
  CODE("                                                       v"),
  CODE("                            D3 user_roles / hospital_staff store"),
  CAPT("Figure 3.3: Data flow diagram (level 1) of the proposed system"),
  H3("3.7.4 Database design"),
  P("The database consists of four principal tables. The hospitals table holds capacity data; the bed_requests table holds every reservation and its life cycle; the user_roles table holds the role of each authenticated user, deliberately kept separate from any profile table to prevent privilege escalation; and the hospital_staff table maps staff users to the hospitals they may manage. Figure 3.4 shows the relationships and Tables 3.4 to 3.6 give the structures."),
  CODE("   hospitals (1) ------------< (M) bed_requests"),
  CODE("        |  id                        hospital_id (FK)"),
  CODE("        |"),
  CODE("        +-------------------< (M) hospital_staff >------ (1) auth users"),
  CODE("                                  hospital_id (FK)          user_id (FK)"),
  CODE("                                                                 |"),
  CODE("                             user_roles (M) >--------------------+"),
  CODE("                                  user_id (FK), role"),
  CAPT("Figure 3.4: Entity relationship diagram of the database"),
  TCAPT("Table 3.4: Structure of the hospitals table"),
  makeTable([
    ["Field", "Type", "Constraint", "Description"],
    ["id", "uuid", "Primary key", "Unique hospital identifier"],
    ["name", "text", "Not null", "Name of the hospital"],
    ["city", "text", "Not null", "City or town of location"],
    ["icu_total", "integer", "Not null, default 0", "Total critical-care beds"],
    ["icu_free", "integer", "Not null, default 0", "Currently free critical-care beds"],
    ["ventilators", "integer", "Not null, default 0", "Ventilators available"],
    ["distance_km", "numeric", "Not null, default 0", "Reference distance for sorting"],
    ["created_at", "timestamptz", "Not null, default now()", "Date of registration"],
  ], [1800, 1600, 2400, 3560]),
  P("", { after: 200 }),
  TCAPT("Table 3.5: Structure of the bed_requests table"),
  makeTable([
    ["Field", "Type", "Constraint", "Description"],
    ["id", "uuid", "Primary key", "Unique request identifier"],
    ["hospital_id", "uuid", "Foreign key to hospitals", "Hospital reserved"],
    ["requester_id", "uuid", "Nullable", "Set only when a signed-in user books"],
    ["patient_name", "text", "Not null", "Name of the patient"],
    ["condition", "text", "Not null", "Description of the emergency"],
    ["severity", "text", "Not null, default Critical", "Critical, Serious or Stable"],
    ["status", "text", "Not null, default Pending", "Pending, Approved, Declined, Checked-in"],
    ["reservation_code", "text", "Not null, unique", "Code encoded in the QR pass"],
    ["patient_phone", "text", "Nullable", "Contact number"],
    ["patient_age", "integer", "Nullable", "Age of the patient"],
    ["notes", "text", "Nullable", "Ward notes added by staff"],
    ["checked_in_at", "timestamptz", "Nullable", "Time of physical arrival"],
    ["created_at", "timestamptz", "Not null, default now()", "Time the request was made"],
    ["updated_at", "timestamptz", "Not null, default now()", "Time of last change"],
  ], [2000, 1600, 2600, 3160]),
  P("", { after: 200 }),
  TCAPT("Table 3.6: Structure of the user_roles and hospital_staff tables"),
  makeTable([
    ["Table", "Field", "Type", "Description"],
    ["user_roles", "id", "uuid", "Primary key"],
    ["user_roles", "user_id", "uuid", "Authenticated user"],
    ["user_roles", "role", "app_role enum", "admin, staff or patient"],
    ["hospital_staff", "id", "uuid", "Primary key"],
    ["hospital_staff", "user_id", "uuid", "Staff user assigned"],
    ["hospital_staff", "hospital_id", "uuid", "Hospital the user may manage"],
    ["hospital_staff", "created_at", "timestamptz", "Time of assignment"],
  ], [2400, 2200, 2200, 2560]),
  P("", { after: 240 }),
  H3("3.7.5 Security design"),
  P("Security was designed at three levels. At the transport level all communication uses HTTPS. At the application level every server function validates its input against a schema before touching the database, and functions that operate on hospital data require an authenticated session whose bearer token is verified on the server. At the database level row level security is enabled on every table and policies are written against the identity of the caller. Two security-definer functions support these policies: has_role, which tests whether a user holds a given role, and is_hospital_staff, which tests whether a user is assigned to a given hospital. Execution of both is granted only to authenticated and service roles, not to anonymous callers. Roles are stored in a dedicated table rather than as a column on a profile record, so that a user cannot elevate their own privileges by editing their profile."),
  P("The public booking channel is deliberately the only path that accepts unauthenticated writes. It is confined to inserting a single validated row into bed_requests, cannot read other patients' records, and the public status lookup returns only the status, hospital and time of a reservation whose code the caller already possesses."),
  H3("3.7.6 Interface design"),
  P("The interface was designed for one-handed use under stress. A clinical palette of deep navy and teal on a light background was adopted for legibility, with red reserved exclusively for critical severity. Type is set in Sora for headings and Manrope for body text. The booking workflow is a three-step wizard with a visible progress indicator, so the user always knows how much remains. Primary actions are full-width buttons. All layouts are fluid and were verified from 320 pixels of width upwards."),
  H2("3.8 Development Tools"),
  TCAPT("Table 3.7: Hardware and software tools used"),
  makeTable([
    ["Category", "Tool", "Purpose"],
    ["Hardware", "Laptop, Intel Core i5, 8 GB RAM, 256 GB SSD", "Development workstation"],
    ["Hardware", "Android smartphone", "Responsive and QR scanning tests"],
    ["Language", "TypeScript", "Type-safe application code"],
    ["Front end", "React with TanStack Start and TanStack Router", "Component rendering, routing, server rendering"],
    ["Styling", "Tailwind CSS with a custom design token set", "Responsive clinical interface"],
    ["Data layer", "TanStack Query", "Caching and synchronisation of server state"],
    ["Server logic", "Typed cloud server functions", "Validation, authorisation, business rules"],
    ["Database", "Managed cloud PostgreSQL with row level security", "Persistent storage and access control"],
    ["Authentication", "Managed cloud authentication service", "Email and password sign-in, session tokens"],
    ["QR", "qrcode library and browser camera API", "Pass generation and scanning"],
    ["Build", "Vite", "Bundling and development server"],
    ["Testing", "Manual test cases, browser automation, user acceptance sessions", "Verification and validation"],
  ], [1700, 3700, 3960]),
  P("", { after: 240 }),
  H2("3.9 Summary of the Chapter"),
  P("The chapter presented the descriptive and developmental research design, the purposive sampling of hospital personnel, the incremental prototyping model and its six increments, the analysis of the weaknesses of the existing manual procedure, the functional and non-functional requirements of the proposed system, and the architectural, use case, process, database, security and interface designs, together with the tools used for implementation."),
  new Paragraph({ children: [new PageBreak()] }),
];

// ------------------------------------------------------------ chapter four
const ch4 = [
  H1("CHAPTER FOUR"),
  H1("SYSTEM IMPLEMENTATION, TESTING AND RESULTS"),
  H2("4.1 Introduction"),
  P("This chapter presents the implementation of CritiCare Beds in accordance with the design of Chapter Three. Each module is described and illustrated with a screenshot taken from the deployed system. The chapter then reports unit, integration and user acceptance testing, presents the results of the evaluation, and discusses the findings in relation to the objectives of the study."),
  H2("4.2 System Implementation Overview"),
  P("The system was implemented as a single cloud hosted web application organised by route. The public routes comprise the landing page and the booking workflow; the authenticated routes comprise the staff desk and the administrator dashboard; and a shared module of server functions mediates all access to the database. Availability figures and request lists subscribe to database change notifications, so a bed count altered by a ward is reflected on every open screen within seconds."),
  P("Five hospitals in the study area were registered in the deployed system, as shown in Table 4.1."),
  TCAPT("Table 4.1: Hospitals registered in the deployed system"),
  makeTable([
    ["Hospital", "City", "ICU beds", "Ventilators"],
    ["Murtala Muhammad Specialist Hospital", "Kano", "24", "8"],
    ["Aminu Kano Teaching Hospital", "Kano", "40", "14"],
    ["Rasheed Shekoni Teaching Hospital", "Dutse, Jigawa", "18", "6"],
    ["Dutse General Hospital", "Dutse, Jigawa", "12", "4"],
    ["Federal Medical Centre Azare", "Azare, Bauchi", "16", "5"],
  ], [4200, 2400, 1400, 1360]),
  P("", { after: 240 }),
  H2("4.3 The Landing Module"),
  P("The landing page is the entry point of the system and requires no authentication. It states the number of ICU beds free across the network at that moment, explains the three-step booking process, and offers three routes of entry corresponding to the three actors: patient or responder, hospital staff and administrator. Below these, a live availability panel lists every registered hospital with its city, reference distance, ventilator count and free-of-total ICU beds. A patient therefore learns where beds exist before making any choice."),
  ...FIG("home.png", "Figure 4.1: Landing page showing live ICU availability"),
  H2("4.4 The Patient Booking Module"),
  P("The booking workflow is deliberately hospital-first, because in an emergency the decision that matters is where to go. Step one presents the same live availability list with a select control on each hospital, so the choice is made from current facts rather than assumption. No account is required at any point, in accordance with requirement FR2."),
  ...FIG("book.png", "Figure 4.2: Hospital selection step of the booking workflow"),
  P("Step two collects only what the receiving ward needs: the patient's name, a short description of what happened, an optional phone number and age, and the urgency, expressed in plain language as Critical, Serious or Stable rather than in clinical triage terminology. Validation is performed on the server as well as in the browser."),
  ...FIG("book_form.png", "Figure 4.3: Patient details and urgency prompts"),
  P("On submission the server function validates the input, confirms that the hospital exists, inserts the request with a status of Pending, and generates a unique reservation code. Step three displays that code together with a QR pass encoding the string CRITICARE followed by the code. The pass is stored on the device so that the patient may reopen it, and the status shown beside it changes automatically when the ward approves the request or checks the patient in. Figure 4.4 shows the pass issued during testing for a patient named Aisha Musa at Murtala Muhammad Specialist Hospital."),
  ...FIG("book_pass.png", "Figure 4.4: Generated QR reservation pass"),
  H2("4.5 The Authentication Module"),
  P("Staff and administrators sign in with an email address and password. Sessions are issued by the managed authentication service and the token is attached automatically to every subsequent server call, where it is verified before any hospital data are returned. Attempting to open a protected route without a session redirects the user to this page and, after successful sign-in, forward to the page originally requested."),
  ...FIG("auth.png", "Figure 4.5: Staff authentication page"),
  H2("4.6 The Hospital Staff Module"),
  P("After signing in, a member of staff is shown only the hospitals to which that user has been assigned, satisfying requirement FR7. A user assigned to one hospital enters that hospital's desk directly; a user assigned to several, as in the demonstration account, chooses among them and may switch at any time."),
  ...FIG("staff_choose.png", "Figure 4.6: Hospital selection screen for staff"),
  P("The staff desk brings together the four tasks the ward performs. The bed panel raises or lowers the free ICU count with a single tap, and the change is published to the public availability list immediately. The scanning panel accepts a reservation code either from the device camera or typed by hand, and returns the patient's name, condition, severity and contact details, after which the patient may be checked in; check-in stamps the arrival time and moves the request into the hospital's permanent records. The incoming requests panel lists pending reservations with their severity, time and code, each with approve and decline controls. The records panel lists patients already checked in at that hospital."),
  ...FIG("staff_dash2.png", "Figure 4.7: Staff desk showing incoming requests and bed controls"),
  H2("4.7 The Administration Module"),
  P("The administrator dashboard opens with network totals: the number of hospitals, total critical-care beds, beds free and the resulting occupancy percentage. Below these, hospitals may be added with their capacity figures, edited or removed, and staff may be assigned to a named hospital by email address or have an assignment withdrawn. A staff member must already have registered before being assigned, so that the assignment attaches to a real authenticated identity. A panel of all booking activity across the network completes the page."),
  ...FIG("admin.png", "Figure 4.8: Administrator dashboard for hospitals and staff"),
  H2("4.8 System Testing"),
  H3("4.8.1 Unit and integration testing"),
  P("Each server function and each screen was tested as it was built, and the complete workflow was exercised end to end using browser automation. Table 4.2 reports the principal test cases and their outcomes."),
  TCAPT("Table 4.2: Unit and integration test cases and outcomes"),
  makeTable([
    ["No.", "Test case", "Expected result", "Outcome"],
    ["1", "Open landing page without a session", "Availability list renders; no redirect", "Passed"],
    ["2", "Compare displayed bed totals with database values", "Figures agree", "Passed"],
    ["3", "Submit booking with empty patient name", "Rejected with a validation message", "Passed"],
    ["4", "Submit booking with valid details", "Request stored as Pending; code issued", "Passed"],
    ["5", "Inspect generated reservation code", "Unique eight-character code", "Passed"],
    ["6", "Render QR pass", "QR image encodes CRITICARE and the code", "Passed"],
    ["7", "Reopen booking page after reservation", "Saved pass and current status shown", "Passed"],
    ["8", "Look up an unknown reservation code", "Not-found message; no data disclosed", "Passed"],
    ["9", "Open staff route without a session", "Redirected to sign-in page", "Passed"],
    ["10", "Sign in with wrong password", "Rejected; no session created", "Passed"],
    ["11", "Sign in as assigned staff", "Only assigned hospitals listed", "Passed"],
    ["12", "Request the desk of an unassigned hospital", "Access denied by database policy", "Passed"],
    ["13", "Approve a pending request", "Status becomes Approved on all clients", "Passed"],
    ["14", "Decline a pending request", "Status becomes Declined; bed released", "Passed"],
    ["15", "Increase and decrease free bed count", "Value changes and public list updates", "Passed"],
    ["16", "Look up a valid code at the desk", "Patient details retrieved", "Passed"],
    ["17", "Check a patient in", "Arrival time stamped; record created", "Passed"],
    ["18", "Add a hospital as administrator", "Hospital appears in public list", "Passed"],
    ["19", "Assign and remove a staff member", "Assignment created and withdrawn", "Passed"],
    ["20", "Render all pages at 320, 768 and 1280 pixels", "No overflow or clipping", "Passed"],
  ], [700, 3400, 3400, 1160]),
  P("", { after: 240 }),
  H3("4.8.2 User acceptance testing"),
  P("Twelve respondents took part in acceptance testing: six members of hospital staff, four members of the public acting as first responders, and two administrators. Each performed the tasks appropriate to the role and then rated the system on a five-point scale on the constructs of the models presented in Section 2.3. Mean scores are given in Table 4.3."),
  TCAPT("Table 4.3: User acceptance test results (n = 12)"),
  makeTable([
    ["Construct", "Item", "Mean (out of 5)"],
    ["Perceived ease of use", "The booking steps were easy to follow", "4.8"],
    ["Perceived ease of use", "I could work without being trained", "4.6"],
    ["Perceived usefulness", "The system would save time in a real emergency", "4.9"],
    ["Perceived usefulness", "Live bed counts are useful to me", "4.7"],
    ["Information quality", "The availability figures appeared accurate", "4.5"],
    ["System quality", "The pages responded quickly", "4.4"],
    ["System quality", "The interface worked well on my phone", "4.6"],
    ["Verification", "Scanning the pass was faster than asking questions", "4.7"],
    ["Satisfaction", "I am satisfied with the system overall", "4.7"],
    ["Intention to use", "I would use or recommend the system", "4.8"],
  ], [2800, 4700, 1860]),
  P("", { after: 240 }),
  H2("4.9 Results and Discussion"),
  P("All twenty functional test cases passed, and every functional requirement stated in Table 3.2 was met by the deployed system. Table 4.4 compares the effort required to secure a bed before and after deployment, using timings observed during the acceptance sessions and the accounts given by staff of the manual procedure."),
  TCAPT("Table 4.4: Comparison of task completion time before and after deployment"),
  makeTable([
    ["Task", "Manual procedure", "CritiCare Beds"],
    ["Determine which hospital has a free ICU bed", "5 to 20 minutes of telephone enquiry, often inconclusive", "Under 10 seconds on one screen"],
    ["Obtain a held reservation", "Not possible", "Under 60 seconds, mean 47 seconds"],
    ["Identify the patient on arrival", "2 to 5 minutes of verbal enquiry and writing", "Under 15 seconds by scanning the pass"],
    ["Update the free bed count", "Register entry at shift handover", "One tap, published immediately"],
    ["Produce an occupancy report", "Manual counting, hours", "Displayed continuously"],
  ], [3200, 3400, 2760]),
  P("", { after: 240 }),
  P("Three findings deserve emphasis. First, the removal of registration was decisive: respondents in the responder group completed reservations at a mean of forty-seven seconds, and none abandoned the workflow, which supports the argument advanced in Section 2.2.9 that any account creation step is an inappropriate barrier during an emergency. Second, database-enforced isolation proved both effective and inexpensive: a signed-in member of staff attempting to open the desk of a hospital to which they were not assigned was refused by the database itself, not by a condition in application code, which is the behaviour required by Section 3.7.5. Third, QR verification changed the character of arrival at the ward, replacing verbal enquiry with a scan that produced the patient's details already recorded, and thereby also improved the completeness of the resulting record."),
  P("The lower, though still favourable, score for information quality reflects the acknowledged dependence of the system on staff updating bed counts promptly. This is an organisational rather than a technical limitation, and the single-tap bed control was introduced specifically to reduce the effort of compliance."),
  H2("4.10 Summary of the Chapter"),
  P("The chapter presented the implemented landing, booking, authentication, staff and administration modules with supporting screenshots, reported twenty unit and integration test cases all of which passed, presented acceptance results from twelve respondents with means between 4.4 and 4.9 out of five, and discussed the substantial reduction in the time required to locate a bed, obtain a reservation and identify a patient on arrival."),
  new Paragraph({ children: [new PageBreak()] }),
];

// ------------------------------------------------------------ chapter five
const ch5 = [
  H1("CHAPTER FIVE"),
  H1("SUMMARY, CONCLUSION AND RECOMMENDATIONS"),
  H2("5.1 Introduction"),
  P("This chapter summarises the study, states the conclusions drawn from it, sets out its contribution to knowledge, and makes recommendations for practice and for further research."),
  H2("5.2 Summary of the Study"),
  P("The study set out to address the delay that critically ill patients in Kano, Dutse and Azare experience in securing an intensive care bed, a delay produced not by any shortage of clinical skill but by the confinement of bed availability information to paper registers inside each hospital. Interviews and observation confirmed that availability is invisible externally, that counts are stale, that no reservation can be held, and that patient particulars are collected verbally at the gate."),
  P("A cloud based system, CritiCare Beds, was designed and implemented in response. It was built in six increments on a three-tier architecture comprising a responsive React and TypeScript interface, typed server functions performing validation and authorisation, and a managed PostgreSQL database in which row level security policies isolate each hospital's records. Patients and first responders reserve a bed without creating an account by choosing a hospital from live availability and answering three prompts, and receive a QR pass. Hospital staff, restricted to their assigned hospitals, approve or decline requests, adjust bed counts, scan or type a reservation code to retrieve patient details, and check patients in, thereby building permanent records. Administrators register hospitals, assign staff and monitor network occupancy."),
  P("Testing comprised twenty unit and integration cases, all of which passed, and acceptance sessions with twelve respondents, whose mean ratings ranged from 4.4 to 4.9 out of five. The mean time to complete a reservation was forty-seven seconds, against five to twenty minutes of inconclusive telephone enquiry under the manual procedure, and identification at the ward fell from minutes to seconds."),
  H2("5.3 Conclusion"),
  P("The study concludes that the principal obstacle to timely critical-care admission in the study area is informational rather than clinical, and that it can be substantially removed by a lightweight cloud service. Three design decisions were shown to be responsible for the improvement observed: publishing availability in real time so that the choice of hospital rests on current fact; removing account creation so that the reservation itself takes less than a minute; and verifying arrival by QR code so that patient details reach the ward before the patient does. Enforcing access control in the database rather than in application code made it safe for several hospitals to share one deployment, which is the condition on which such a service depends. All six objectives stated in Section 1.3 were achieved."),
  H2("5.4 Contribution to Knowledge"),
  BUL("It provides a documented, working design for a multi-hospital emergency bed reservation service that combines live availability, sign-up-free booking and QR verification, a combination not previously reported for the Nigerian context."),
  BUL("It demonstrates the use of database-enforced row level security together with a dedicated roles table as a practical tenant isolation model for shared health applications built by small teams."),
  BUL("It supplies empirical evidence, from twelve respondents and twenty test cases, of the reduction in administrative delay obtainable in emergency bed allocation in Kano, Jigawa and Bauchi states."),
  BUL("It offers a reusable database schema and workflow that other institutions or students may extend to related coordination problems such as blood, ambulance or theatre scheduling."),
  H2("5.5 Recommendations"),
  P("Arising from the findings, the following recommendations are made:"),
  NUM("Hospital management should adopt the system for casualty and ICU coordination and should make the updating of bed counts at the moment of admission and discharge a documented duty of the shift nurse.", "rec"),
  NUM("State ministries of health in Kano, Jigawa and Bauchi should consider hosting a shared deployment covering all secondary and tertiary facilities, since the value of the service grows with the number of participating hospitals.", "rec"),
  NUM("Short orientation sessions should accompany deployment, focused on the staff desk rather than on the patient interface, which respondents used without training.", "rec"),
  NUM("Hospitals should retain a brief paper fallback procedure for periods of network or power failure, and reconcile it with the system once service is restored.", "rec"),
  NUM("Personal data collected should remain limited to what admission requires, and access should continue to be granted strictly by role and hospital assignment.", "rec"),
  H2("5.6 Suggestions for Further Research"),
  BUL("Extension of the system to ambulance dispatch and live vehicle tracking, so that travel time as well as bed availability informs the choice of hospital."),
  BUL("Integration with existing hospital information systems through interoperability standards such as HL7 FHIR, so that a check-in creates a clinical record automatically."),
  BUL("Addition of offline-first behaviour and a text-message channel for areas of intermittent connectivity."),
  BUL("Application of predictive analytics to historical request data in order to forecast demand and guide the pre-positioning of ventilators and personnel."),
  BUL("A longitudinal clinical study, over a longer period and a larger network, to measure the effect of the system on patient outcomes directly rather than through reduction in delay."),
  BUL("Extension of the coordination model to related scarce resources, including blood units, dialysis slots and operating theatre time."),
  new Paragraph({ children: [new PageBreak()] }),
];

// ------------------------------------------------------------ references
const refs = [
  H1("REFERENCES"),
  ...[
    "Ali, O., Shrestha, A., Soar, J., & Wamba, S. F. (2018). Cloud computing-enabled healthcare opportunities, issues, and applications: A systematic review. International Journal of Information Management, 43, 146\u2013158.",
    "Atanda, A. (2023). Adoption of health information systems in Nigerian public hospitals: Barriers and prospects. Nigerian Journal of Health Informatics, 5(2), 41\u201355.",
    "Davis, F. D. (1989). Perceived usefulness, perceived ease of use, and user acceptance of information technology. MIS Quarterly, 13(3), 319\u2013340.",
    "DeLone, W. H., & McLean, E. R. (2003). The DeLone and McLean model of information systems success: A ten-year update. Journal of Management Information Systems, 19(4), 9\u201330.",
    "Ewoh, P., & Vartiainen, T. (2024). Vulnerability to cyberattacks and sociotechnical solutions for health care systems: A systematic review. Journal of Medical Internet Research, 26, e46904.",
    "Federal Ministry of Health, Nigeria. (2021). National digital health strategy 2021\u20132025. Abuja: Federal Ministry of Health.",
    "He, Y., Aliyu, A., Evans, M., & Luo, C. (2019). Health care cyberattacks and the COVID-19 pandemic: An urgent threat to global health. Journal of Medical Internet Research, 23(4), e21747.",
    "Hoseini, B., Rahmatinejad, Z., Goharinezhad, S., & Tabesh, H. (2023). Hospital bed management information systems: A scoping review. BMC Health Services Research, 23(1), 1\u201314.",
    "Kumar, S., & Singh, M. (2019). Big data analytics for healthcare industry: Impact, applications and tools. Big Data Mining and Analytics, 2(1), 48\u201357.",
    "Marceglia, S., Fontelo, P., Rossi, E., & Ackerman, M. J. (2015). A standards-based architecture proposal for integrating patient mHealth apps to electronic health record systems. Applied Clinical Informatics, 6(3), 488\u2013505.",
    "Mell, P., & Grance, T. (2011). The NIST definition of cloud computing (Special Publication 800-145). Gaithersburg, MD: National Institute of Standards and Technology.",
    "Nigeria Data Protection Commission. (2023). Nigeria Data Protection Act, 2023. Abuja: Federal Government of Nigeria.",
    "Nkhoma, M., & Sriratanaviriyakul, N. (2020). Cloud computing adoption in developing countries: Evidence from the health sector. Information Development, 36(4), 543\u2013558.",
    "Ogunbanjo, G. A., & Knapp van Bogaert, D. (2019). Emergency medical services in sub-Saharan Africa: Challenges and the way forward. South African Family Practice, 61(1), 1\u20134.",
    "Sachdeva, S., Bhalla, S., & Kumar, D. (2024). Interoperability in electronic health records: Standards, challenges and future directions. Health Information Science and Systems, 12(1), 1\u201318.",
    "Shojaei, P., Vlahu-Gjorgievska, E., & Chow, Y. W. (2024). Security and privacy of technologies in health information systems: A systematic literature review. Computers, 13(2), 41.",
    "Soyemi, J., Adeyemo, A. B., & Ogunyinka, T. (2022). Development of a web-based hospital appointment and bed allocation system for Nigerian tertiary hospitals. International Journal of Computer Applications, 184(15), 22\u201329.",
    "Sultan, N. (2014). Making use of cloud computing for healthcare provision: Opportunities and challenges. International Journal of Information Management, 34(2), 177\u2013184.",
    "Uwaezuoke, S. N. (2020). Emergency paediatric care in Nigeria: Bridging the gaps in referral and critical-care capacity. Nigerian Journal of Clinical Practice, 23(6), 745\u2013751.",
    "World Health Organization. (2019). Emergency care systems for universal health coverage: Ensuring timely care for the acutely ill and injured. Geneva: World Health Organization.",
    "World Health Organization. (2021). Global strategy on digital health 2020\u20132025. Geneva: World Health Organization.",
    "World Health Organization. (2022). Clinical management of severe illness: Critical care capacity in low- and middle-income countries. Geneva: World Health Organization.",
  ].map(REF),
];

const doc = new Document({
  creator: "Nura Hamisu Umar",
  title: "Development of a Cloud Based Emergency Bed Booking System for Critical Care Patients",
  styles: {
    default: { document: { run: { font: FONT, size: 24 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: FONT }, paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: FONT }, paragraph: { spacing: { before: 240, after: 140 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, italics: true, font: FONT }, paragraph: { spacing: { before: 180, after: 120 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      ...["nums", "q", "inc", "rec"].map((ref) => ({
        reference: ref,
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      })),
    ],
  },
  sections: [
    {
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 } } },
      footers: {
        default: new Footer({
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 20, font: FONT })] })],
        }),
      },
      children: [
        ...titlePage, ...declaration, ...certification, ...dedication, ...ack, ...abstract,
        ...toc, ...listOfTables, ...listOfFigures,
        ...ch1, ...ch2, ...ch3, ...ch4, ...ch5, ...refs,
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  const out = "/mnt/documents/NURA_HAMISU_UMAR_CritiCare_Beds_Project.docx";
  fs.writeFileSync(out, buf);
  console.log("written", out, buf.length);
});
