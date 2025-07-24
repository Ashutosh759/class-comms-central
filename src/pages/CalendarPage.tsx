import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Calendar as CalendarIcon, Clock, Users, Trash2, CheckCircle2, Circle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, isSameDay, startOfMonth, endOfMonth } from "date-fns";

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_type: string;
  audience: string[];
  classroom_id?: string;
  created_by: string;
  classroom?: {
    name: string;
  };
}

interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  completed: boolean;
  created_at: string;
  user_id: string;
}

interface Classroom {
  id: string;
  name: string;
}

const CalendarPage = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  
  // Event form state
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    date: "",
    type: "",
    classroom: "",
    audience: [] as string[]
  });

  // Task form state
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    dueDate: ""
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!profile) return;
    
    try {
      setLoading(true);
      
      // Fetch events - simplified query without joins
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (eventsError) throw eventsError;

      // Get classroom names for events
      let enrichedEvents: Event[] = [];
      if (eventsData && eventsData.length > 0) {
        const classroomIds = [...new Set(eventsData.map(e => e.classroom_id).filter(Boolean))];
        let classroomsData: any[] = [];
        
        if (classroomIds.length > 0) {
          const { data } = await supabase
            .from('classrooms')
            .select('id, name')
            .in('id', classroomIds);
          classroomsData = data || [];
        }

        enrichedEvents = eventsData.map(event => ({
          ...event,
          classroom: classroomsData.find(c => c.id === event.classroom_id)
        })).filter(event => {
          // If user created the event, show it
          if (event.created_by === user?.id) return true;
          // If event audience includes user's role, show it
          return event.audience.includes(profile.role);
        });
      }

      setEvents(enrichedEvents);

      // Fetch user's tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // Fetch classrooms for teachers
      if (profile.role === 'teacher') {
        const { data: classroomsData, error: classroomsError } = await supabase
          .from('classrooms')
          .select('id, name');
        
        if (classroomsError) throw classroomsError;
        setClassrooms(classroomsData || []);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load calendar data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async () => {
    if (!eventForm.title || !eventForm.date || !eventForm.type) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('events')
        .insert({
          title: eventForm.title,
          description: eventForm.description,
          event_date: eventForm.date,
          event_type: eventForm.type,
          audience: eventForm.audience.length > 0 ? eventForm.audience : ['teacher', 'student', 'parent'],
          classroom_id: eventForm.classroom || null,
          created_by: user?.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event created successfully",
      });

      // Reset form
      setEventForm({
        title: "",
        description: "",
        date: "",
        type: "",
        classroom: "",
        audience: []
      });
      setShowEventDialog(false);
      
      fetchData();
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      });
    }
  };

  const createTask = async () => {
    if (!taskForm.title) {
      toast({
        title: "Error",
        description: "Please enter a task title",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          title: taskForm.title,
          description: taskForm.description,
          due_date: taskForm.dueDate || null,
          user_id: user?.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task created successfully",
      });

      // Reset form
      setTaskForm({
        title: "",
        description: "",
        dueDate: ""
      });
      setShowTaskDialog(false);
      
      fetchData();
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    }
  };

  const toggleTaskCompletion = async (taskId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: !completed })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, completed: !completed } : task
      ));

      toast({
        title: "Success",
        description: completed ? "Task marked as incomplete" : "Task completed!",
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks(tasks.filter(task => task.id !== taskId));
      
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  const getEventsForSelectedDate = () => {
    if (!selectedDate) return [];
    return events.filter(event => 
      isSameDay(new Date(event.event_date), selectedDate)
    );
  };

  const getThisMonthEvents = () => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    
    return events.filter(event => {
      const eventDate = new Date(event.event_date);
      return eventDate >= start && eventDate <= end;
    });
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'assignment': return 'bg-blue-500';
      case 'exam': return 'bg-red-500';
      case 'meeting': return 'bg-green-500';
      case 'holiday': return 'bg-yellow-500';
      case 'announcement': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const handleAudienceChange = (audience: string, checked: boolean) => {
    if (checked) {
      setEventForm(prev => ({
        ...prev,
        audience: [...prev.audience, audience]
      }));
    } else {
      setEventForm(prev => ({
        ...prev,
        audience: prev.audience.filter(a => a !== audience)
      }));
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar & Tasks</h1>
          <p className="text-muted-foreground">Manage your events and to-do list</p>
        </div>
        <div className="flex space-x-2">
          {profile?.role === 'teacher' && (
            <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Event</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Event title"
                    value={eventForm.title}
                    onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  />
                  <Textarea
                    placeholder="Event description"
                    value={eventForm.description}
                    onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                  <Input
                    type="datetime-local"
                    value={eventForm.date}
                    onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                  <Select value={eventForm.type} onValueChange={(value) => setEventForm(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assignment">Assignment</SelectItem>
                      <SelectItem value="exam">Exam</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="holiday">Holiday</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {classrooms.length > 0 && (
                    <Select value={eventForm.classroom} onValueChange={(value) => setEventForm(prev => ({ ...prev, classroom: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select classroom (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Classrooms</SelectItem>
                        {classrooms.map((classroom) => (
                          <SelectItem key={classroom.id} value={classroom.id}>
                            {classroom.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Audience</label>
                    <div className="space-y-2">
                      {['teacher', 'student', 'parent'].map((role) => (
                        <div key={role} className="flex items-center space-x-2">
                          <Checkbox
                            id={role}
                            checked={eventForm.audience.includes(role)}
                            onCheckedChange={(checked) => handleAudienceChange(role, checked as boolean)}
                          />
                          <label htmlFor={role} className="text-sm capitalize">{role}s</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button onClick={createEvent} className="w-full">
                    Create Event
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          
          <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Task title"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                />
                <Textarea
                  placeholder="Task description (optional)"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                />
                <Input
                  type="datetime-local"
                  placeholder="Due date (optional)"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                />
                <Button onClick={createTask} className="w-full">
                  Create Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2" />
              Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-6">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
              
              {/* Events for selected date */}
              <div className="flex-1">
                <h3 className="font-semibold mb-4">
                  Events for {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Selected Date'}
                </h3>
                <div className="space-y-2">
                  {getEventsForSelectedDate().length === 0 ? (
                    <p className="text-muted-foreground">No events for this date</p>
                  ) : (
                    getEventsForSelectedDate().map((event) => (
                      <Card key={event.id} className="p-3">
                        <div className="flex items-start space-x-3">
                          <div className={`w-3 h-3 rounded-full ${getEventTypeColor(event.event_type)} mt-1`} />
                          <div className="flex-1">
                            <h4 className="font-medium">{event.title}</h4>
                            {event.description && (
                              <p className="text-sm text-muted-foreground">{event.description}</p>
                            )}
                            <div className="flex items-center space-x-2 mt-1">
                              <Clock className="h-3 w-3" />
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(event.event_date), 'h:mm a')}
                              </span>
                              <Badge variant="secondary" className="text-xs capitalize">
                                {event.event_type}
                              </Badge>
                              {event.classroom && (
                                <Badge variant="outline" className="text-xs">
                                  {event.classroom.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              To-Do List
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tasks.length === 0 ? (
                <p className="text-muted-foreground">No tasks yet</p>
              ) : (
                tasks.map((task) => (
                  <Card key={task.id} className="p-3">
                    <div className="flex items-start space-x-3">
                      <button
                        onClick={() => toggleTaskCompletion(task.id, task.completed)}
                        className="mt-1"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                      <div className="flex-1">
                        <h4 className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        )}
                        {task.due_date && (
                          <div className="flex items-center space-x-1 mt-1">
                            <Clock className="h-3 w-3" />
                            <span className="text-xs text-muted-foreground">
                              Due: {format(new Date(task.due_date), 'MMM d, h:mm a')}
                            </span>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTask(task.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* This Month's Events */}
      <Card>
        <CardHeader>
          <CardTitle>This Month's Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getThisMonthEvents().length === 0 ? (
              <p className="text-muted-foreground col-span-full">No events this month</p>
            ) : (
              getThisMonthEvents().map((event) => (
                <Card key={event.id} className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getEventTypeColor(event.event_type)} mt-1`} />
                    <div className="flex-1">
                      <h4 className="font-medium">{event.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.event_date), 'MMM d, h:mm a')}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="secondary" className="text-xs capitalize">
                          {event.event_type}
                        </Badge>
                        {event.classroom && (
                          <Badge variant="outline" className="text-xs">
                            {event.classroom.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarPage;