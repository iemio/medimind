// import React from "react";
// import CustomFormField from "./customFormField";

// const ScheduleAppointment = () => {
//     return (
//         <div>
//             <CustomFormField
//                 fieldType={FormFieldType.SELECT}
//                 control={form.control}
//                 name="primaryPhysician"
//                 label="Doctor"
//                 placeholder="Select a doctor"
//             >
//                 {Doctors.map((doctor, i) => (
//                     <SelectItem key={doctor.name + i} value={doctor.name}>
//                         <div className="flex cursor-pointer items-center gap-2">
//                             <Image
//                                 src={doctor.image}
//                                 width={32}
//                                 height={32}
//                                 alt="doctor"
//                                 className="rounded-full border border-dark-500"
//                             />
//                             <p>{doctor.name}</p>
//                         </div>
//                     </SelectItem>
//                 ))}
//             </CustomFormField>

//             <CustomFormField
//                 fieldType={FormFieldType.DATE_PICKER}
//                 control={form.control}
//                 name="schedule"
//                 label="Expected appointment date"
//                 showTimeSelect
//                 dateFormat="MM/dd/yyyy  -  h:mm aa"
//             />
//         </div>
//     );
// };

// export default ScheduleAppointment;
