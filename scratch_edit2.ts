
function CoursePreviewModal({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const { data: course, isLoading } = useCourse(courseId);

  if (isLoading) return <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;
  if (!course) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50" onClick={onClose}>
       <div className="bg-white rounded-xl shadow-xl w-[600px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
           <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
             <h2 className="text-[16px] font-bold text-slate-900">Preview: {course.title}</h2>
             <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>
           </div>
           <div className="p-5 space-y-4 overflow-y-auto">
             <div className="flex gap-2">
               <span className="px-2 py-1 bg-slate-100 rounded text-[11px] font-medium">{course.category?.replace('_', ' ')}</span>
               <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[11px] font-medium">{course.difficulty}</span>
               <span className="px-2 py-1 bg-slate-100 rounded text-[11px] font-medium">{course.estimatedHours}h {course.estimatedMinutes}m</span>
             </div>
             <p className="text-[13px] text-slate-600">{course.description}</p>
             
             <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                  <p className="text-[12px] font-bold text-slate-800">Course Curriculum</p>
                </div>
                {course.sections?.length === 0 && <div className="p-4 text-center text-[12px] text-slate-400">No content added yet.</div>}
                {course.sections?.map((sec: any, i: number) => (
                  <div key={sec.id} className="border-b border-slate-100 last:border-0">
                    <div className="px-4 py-2 bg-slate-50/50">
                       <p className="text-[12.5px] font-semibold text-slate-800">Section {i+1}: {sec.title}</p>
                    </div>
                    {sec.lessons?.map((l: any, j: number) => (
                       <div key={l.id} className="px-5 py-2 flex items-center gap-2 hover:bg-slate-50">
                          <Play className="w-3 h-3 text-blue-500" />
                          <p className="text-[12px] text-slate-600">{j+1}. {l.title}</p>
                          <span className="ml-auto text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-400">{l.type}</span>
                       </div>
                    ))}
                    {sec.quiz && (
                       <div className="px-5 py-2 flex items-center gap-2 hover:bg-slate-50 border-t border-slate-100">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <p className="text-[12px] text-slate-600">{sec.quiz.title} ({sec.quiz.questions?.length} Questions) - Passing: {sec.quiz.passThreshold}%</p>
                       </div>
                    )}
                  </div>
                ))}
             </div>
           </div>
       </div>
    </div>
  )
}

